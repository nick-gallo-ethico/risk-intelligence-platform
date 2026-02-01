# Ethico Risk Intelligence Platform
## PRD-007: Analytics & Reporting

**Document ID:** PRD-007
**Version:** 3.0 (RIU Architecture Update)
**Priority:** P1 - High (Core Module)
**Development Phase:** Phase 2
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md` (v3.2 - authoritative RIU→Case architecture)
- Analytics Data Model: `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md` (v3.1)
- Disclosures: `02-MODULES/06-DISCLOSURES/PRD.md`
- Policy Management: `02-MODULES/09-POLICY-MANAGEMENT/PRD.md`

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

> **Architecture Note:** This PRD implements analytics for the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. Risk Intelligence Units (RIUs) are **immutable inputs**; Cases are **mutable work containers**. This separation enables distinct analytics perspectives: Input metrics (RIUs) vs Response metrics (Cases).

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [RIU vs Case Analytics Framework](#riu-vs-case-analytics-framework)
3. [AI-First Considerations](#ai-first-considerations)
4. [User Stories](#user-stories)
5. [Feature Specifications](#feature-specifications)
   - F1: Dashboard Builder
   - F2: Widget Library
   - F3: Report Builder
   - F4: Saved Views
   - F5: Board Reports
   - F6: Scheduled Reports
   - F7: Export Capabilities
   - F8: Pre-built Templates
6. [Data Model](#data-model)
7. [API Specifications](#api-specifications)
8. [UI/UX Specifications](#uiux-specifications)
9. [Non-Functional Requirements](#non-functional-requirements)

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
- Unified data across RIUs, Cases, Disclosures, Policies, and Attestations
- Clear separation of **Input metrics** (RIUs) vs **Response metrics** (Cases)

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
| Input vs Response metrics | No separation | No separation | RIU→Case analytics |
| AI insights | No | No | Anomaly detection, summaries |
| Board reports | PowerPoint export | PDF only | AI-generated presentations |
| Real-time metrics | No | No | Live widgets |
| Custom calculations | No | Limited | Formula builder |
| Scheduled delivery | Email only | Email only | Email, Slack, SFTP, Webhook |

---

## RIU vs Case Analytics Framework

### The Fundamental Insight

The platform's RIU→Case architecture enables analytics perspectives that were impossible with monolithic case models. This separation distinguishes between **what was reported** (immutable inputs) and **how the organization responded** (mutable work containers).

### Metric Categories

| Metric Type | Data Source | Description | Example Metrics |
|-------------|-------------|-------------|-----------------|
| **Input Volume** | RIUs | What's coming in | Reports received, channel mix, geographic distribution, anonymous vs identified ratio |
| **Response Metrics** | Cases | How we're responding | Time to assignment, investigation duration, substantiation rates, outcomes |
| **Conversion Rates** | RIU→Case links | Escalation patterns | % of disclosures requiring review, hotline→case rate, escalation rates by category |
| **Campaign Metrics** | Campaigns | Outbound completion | Disclosure completion rates, attestation compliance, overdue rates |
| **Cross-Pillar Intelligence** | Entity relationships | Connected insights | Subjects appearing across cases, policy violations linked to cases |

### RIU Types for Analytics

Risk Intelligence Units (RIUs) are categorized by type for analytics:

| RIU Type | Source Module | Creates Case? | Key Metrics |
|----------|---------------|---------------|-------------|
| `hotline_report` | Operator Console | Always (after QA) | Call volume, duration, operator efficiency |
| `web_form_submission` | Employee Portal | Always | Self-service adoption, time of day patterns |
| `proxy_report` | Manager Portal | Always | Manager engagement, department patterns |
| `disclosure_response` | Disclosures Module | If threshold met | Completion rate, conflict rates, escalation % |
| `attestation_response` | Policy Module | If failure/refusal | Compliance rate, failure patterns |
| `incident_form` | Web Forms | Configurable | Volume by form type, completion rates |
| `chatbot_transcript` | Employee Chatbot | If escalation | Deflection rate, escalation triggers |
| `survey_response` | Campaigns | If flagged | Participation rate, flagged response % |

### Standard Dashboard Views

**RIU Dashboard (Input Analysis):**
- Reports by channel (hotline, web, chatbot, proxy) over time
- Reports by category with trend analysis
- Geographic distribution of reports
- Anonymous vs. identified ratio
- Campaign completion rates (disclosure, attestation)
- Average time from RIU creation to Case creation

**Case Dashboard (Response Analysis):**
- Open cases by status and pipeline stage
- Average days to close by category
- Outcomes distribution (substantiated, unsubstantiated, inconclusive)
- SLA compliance rates
- Investigator workload distribution
- Remediation completion rates

**Cross-Pillar Intelligence Dashboard:**
- Subjects appearing in multiple cases (pattern detection)
- Categories trending up/down over time
- Correlation: policy changes vs case volume changes
- Remediation effectiveness by category
- Hotspot analysis by location/business unit

**RIU→Case Conversion Dashboard:**
- Conversion rate by RIU type
- Time from RIU creation to Case creation (by channel)
- Disclosures requiring review (% above threshold)
- Escalation rates by category/severity
- QA turnaround time (hotline reports)

---

## AI-First Considerations

### Conversational Interface

Users can interact with analytics via natural language. The AI understands the RIU→Case distinction:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Input volume | "How many reports did we receive last quarter?" | RIU count by period |
| Response metrics | "How many cases are open?" | Direct answer with trend |
| Conversion analysis | "What % of disclosures required review?" | RIU→Case conversion rate |
| Trend analysis | "Show me cases by month this year" | Chart with insight |
| Comparison | "Compare Q4 to Q3 report volume" | Side-by-side with % change |
| Anomaly alert | "Anything unusual in the data?" | Detected anomalies highlighted |
| Report request | "Create a report of overdue cases" | Draft report definition |
| Channel analysis | "Which reporting channel has the highest volume?" | RIU breakdown by channel |

**Example Conversation:**
```
User: "What's our average time to close harassment cases?"
AI: "The average time to close harassment cases is 45 days, which is
    12% higher than your overall average of 40 days. This is up from
    38 days last quarter. Would you like to see a breakdown by region
    or investigator?"

User: "Yes, by region"
AI: [Generates bar chart showing regional breakdown]

User: "How many reports came in through the hotline vs web form?"
AI: "Last quarter you received 234 reports total:
    - Hotline: 156 (67%)
    - Web Form: 58 (25%)
    - Chatbot: 12 (5%)
    - Proxy Reports: 8 (3%)

    Hotline volume is up 15% vs prior quarter. Would you like to see
    the trend by month?"
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
- Select fields from RIUs, Cases, Investigations, Disclosures, Policies, Attestations, Campaigns
- Join RIU and Case data via RIU→Case associations
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
| **RIUs (Risk Intelligence Units)** | RIU type, source channel, received date, reporter type (anonymous/identified), category (at intake), severity (at intake), location, ai_risk_score |
| **Cases** | Case number, created date, status, category (may differ from RIU), severity, location, assignee, days open, outcome |
| **RIU→Case Associations** | Association type (primary, related, merged_from), time to case creation |
| **Investigations** | Status, findings, outcome, days to close, investigator |
| **Campaigns** | Campaign type, target audience, completion rate, overdue count |
| **Disclosures** | Type, status, submitter, decision, value, threshold exceeded |
| **Policies** | Title, status, version, effective date, owner |
| **Attestations** | Policy, status, completion date, days overdue |
| **Users** | Name, role, department, last login |
| **Employees** | Name, department, location, manager |

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
| RIUs | All RIUs, By Channel, Pending QA, High Severity, Recent |
| Cases | All Cases, My Cases, Unassigned, High Severity, Overdue |
| Investigations | My Investigations, In Progress, Pending Review |
| Disclosures | Pending Approval, My Disclosures, Threshold Exceeded, Recent |
| Attestations | Overdue, Pending, By Department |
| Campaigns | Active Campaigns, Low Completion, Overdue |

---

### F5: Board Reports

**Description:**
AI-assisted generation of executive presentations for board meetings.

**Templates:**
1. **Quarterly Compliance Review**
   - Input volume (RIUs received by channel)
   - Case outcomes and investigation results
   - Key metrics vs. benchmarks
   - Notable incidents (with linked RIU sources)
   - Program improvements

2. **Annual Compliance Report**
   - Year-over-year comparisons (both inputs and outcomes)
   - Category analysis (RIU intake vs Case findings)
   - Resolution rates and average time to close
   - Campaign completion rates (disclosures, attestations)
   - Recommendations

3. **Hotline Statistics**
   - RIU volume by month (all channels)
   - Source channel breakdown (hotline, web, chatbot, proxy)
   - Anonymous vs. identified ratio
   - Category distribution at intake
   - QA turnaround time
   - Response time metrics (time to Case, time to assignment)

4. **Risk Intelligence Summary**
   - RIU→Case conversion rates by type
   - Disclosure escalation patterns
   - Cross-pillar insights (subjects appearing in multiple cases)
   - Regional hotspot analysis
   - AI-detected patterns and anomalies

**Generation Flow:**
1. User selects template
2. User confirms date range and scope
3. System generates draft with AI narrative
4. User reviews and edits
5. Export to PowerPoint

**AI Capabilities:**
- Generate executive summary (2-3 paragraphs)
- Distinguish input trends (RIUs) from response metrics (Cases)
- Identify key trends and anomalies
- Compare to previous period
- Suggest areas of concern
- Plain-language insights
- Highlight RIU→Case conversion patterns

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

1. **Input Volume Dashboard (RIU-focused)**
   - Total RIUs received (metric card with trend)
   - RIUs by channel (hotline, web, chatbot, proxy)
   - RIUs by category chart
   - Anonymous vs identified ratio
   - Geographic distribution map
   - Recent RIUs list

2. **Compliance Overview (Case-focused)**
   - Open cases metric
   - Cases by category chart
   - Cases by status funnel
   - Monthly trend line
   - SLA compliance gauge
   - Recent cases list

3. **RIU→Case Conversion**
   - Conversion rate by RIU type
   - Time from RIU to Case (by channel)
   - Disclosure escalation rate
   - QA turnaround time
   - Hotline processing efficiency

4. **Investigation Dashboard**
   - My open investigations
   - Investigation pipeline
   - Avg days by category
   - Overdue investigations
   - Completion rate trend

5. **Disclosure Manager**
   - Campaign completion rate gauge
   - Pending approvals count
   - Disclosures by type pie
   - Decision distribution (approved/requires review)
   - Threshold breach rate
   - Overdue approvals list

6. **Attestation Tracker**
   - Completion rate gauge
   - Completion by department
   - Overdue by policy
   - Reminder effectiveness
   - Daily completion trend

7. **Executive Summary**
   - Key metrics cards (RIU volume + Case outcomes)
   - Period comparison (input vs response)
   - Category breakdown
   - Regional heatmap
   - AI-generated insights

8. **Cross-Pillar Intelligence**
   - Repeat subjects across cases
   - Category trends over time
   - Policy violation correlation
   - Hotspot analysis by location/BU

**Report Templates:**

1. **RIU Volume Report** - Input metrics by channel, category, period
2. **Case Detail Export** - Full case data with linked RIUs
3. **Investigation Summary** - Outcomes, durations, investigator metrics
4. **Disclosure Audit Trail** - Campaign responses with escalation tracking
5. **Attestation Compliance** - Completion rates by policy, department
6. **User Activity Report** - Login frequency, actions taken
7. **SLA Performance Report** - Response times, breach rates
8. **Category Analysis** - Trends by category across RIUs and Cases
9. **Regional Breakdown** - Location-based input and response metrics
10. **RIU→Case Conversion Report** - Escalation patterns, processing times

---

## Data Model

### Primary Entities

See `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` for complete schemas:

- **SavedDashboard** - Dashboard definitions
- **DashboardWidget** - Widget configurations
- **SavedReport** - Report definitions
- **ScheduledReport** - Delivery schedules
- **ReportExecution** - Execution history
- **FACT_RIU_DAILY** - Pre-aggregated RIU (input) metrics
- **FACT_CASE_DAILY** - Pre-aggregated Case (response) metrics
- **FACT_CAMPAIGN_DAILY** - Pre-aggregated campaign metrics
- **CaseFact, DisclosureFact, FormFact, AttestationFact** - Legacy fact tables (deprecated in favor of above)

### Analytics Fact Tables

The analytics layer uses pre-aggregated fact tables for dashboard performance. These implement the RIU→Case architecture:

```prisma
// Input metrics - tracks all Risk Intelligence Units received
model FACT_RIU_DAILY {
  id                String   @id @default(uuid())
  date_id           DateTime @db.Date
  organization_id   String

  // RIU dimensions
  riu_type          String   // hotline_report, web_form_submission, disclosure_response, etc.
  source_channel    String   // phone, web_form, chatbot, email, proxy
  category_id       String?
  severity          String?  // HIGH, MEDIUM, LOW (as captured at intake)
  location_id       String?
  business_unit_id  String?

  // Reporter dimensions
  is_anonymous      Boolean
  reporter_type     String?  // anonymous, confidential, identified

  // Conversion tracking
  created_case      Boolean  // Did this RIU create a Case?

  // Metrics
  count             Int      @default(1)

  // Timestamps
  created_at        DateTime @default(now())

  @@index([organization_id, date_id])
  @@index([organization_id, riu_type])
  @@index([organization_id, source_channel])
}

// Response metrics - tracks Case processing and outcomes
model FACT_CASE_DAILY {
  id                String   @id @default(uuid())
  date_id           DateTime @db.Date
  organization_id   String

  // Case dimensions
  status            String   // NEW, OPEN, CLOSED
  outcome           String?  // SUBSTANTIATED, UNSUBSTANTIATED, etc.
  category_id       String?
  severity          String?
  pipeline_stage    String?
  assigned_to_id    String?

  // Metrics
  count             Int      @default(1)
  avg_days_open     Float?
  sla_status        String?  // ON_TRACK, WARNING, OVERDUE

  // Timestamps
  created_at        DateTime @default(now())

  @@index([organization_id, date_id])
  @@index([organization_id, status])
}

// Campaign metrics - tracks disclosure and attestation campaigns
model FACT_CAMPAIGN_DAILY {
  id                    String   @id @default(uuid())
  date_id               DateTime @db.Date
  organization_id       String

  // Campaign dimensions
  campaign_id           String
  campaign_type         String   // disclosure, attestation, survey

  // Metrics
  assignments_total     Int      @default(0)
  assignments_completed Int      @default(0)
  assignments_overdue   Int      @default(0)
  cases_created         Int      @default(0)  // RIUs that escalated to Cases
  completion_rate       Float?

  // Timestamps
  created_at            DateTime @default(now())

  @@index([organization_id, date_id])
  @@index([organization_id, campaign_id])
}

// RIU→Case conversion metrics
model FACT_RIU_CASE_CONVERSION {
  id                    String   @id @default(uuid())
  date_id               DateTime @db.Date
  organization_id       String

  // Dimensions
  riu_type              String
  source_channel        String
  category_id           String?

  // Metrics
  riu_count             Int      @default(0)
  cases_created         Int      @default(0)
  conversion_rate       Float?
  avg_time_to_case_hours Float?  // Time from RIU creation to Case creation

  // Timestamps
  created_at            DateTime @default(now())

  @@index([organization_id, date_id])
  @@index([organization_id, riu_type])
}
```

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
  RIUS                // Risk Intelligence Units
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  CAMPAIGNS
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
# RIU (Input) Analytics
POST   /api/v1/analytics/rius                # Query RIU facts
GET    /api/v1/analytics/rius/volume         # RIU volume over time
GET    /api/v1/analytics/rius/by-channel     # RIU breakdown by source channel
GET    /api/v1/analytics/rius/by-type        # RIU breakdown by type

# Case (Response) Analytics
POST   /api/v1/analytics/cases               # Query case facts
GET    /api/v1/analytics/cases/status        # Case status distribution
GET    /api/v1/analytics/cases/outcomes      # Case outcomes distribution
GET    /api/v1/analytics/cases/sla           # SLA compliance metrics

# RIU→Case Conversion Analytics
POST   /api/v1/analytics/conversion          # Query conversion facts
GET    /api/v1/analytics/conversion/rate     # Conversion rate by RIU type
GET    /api/v1/analytics/conversion/time     # Time to case creation metrics

# Campaign Analytics
POST   /api/v1/analytics/campaigns           # Query campaign facts
GET    /api/v1/analytics/campaigns/:id/completion  # Campaign completion metrics
GET    /api/v1/analytics/campaigns/:id/escalation  # Campaign escalation rates

# Legacy endpoints (maintained for compatibility)
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
POST   /api/v1/analytics/patterns            # Cross-case pattern detection
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

## Acceptance Criteria

### Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | RIU fact table (FACT_RIU_DAILY) populated with input metrics | P0 |
| AC-02 | Case fact table (FACT_CASE_DAILY) populated with response metrics | P0 |
| AC-03 | RIU→Case conversion metrics tracked and reportable | P0 |
| AC-04 | Dashboards can display both RIU and Case widgets side-by-side | P0 |
| AC-05 | Report builder includes RIU data source with all RIU fields | P0 |
| AC-06 | Board reports distinguish input volume (RIUs) from outcomes (Cases) | P0 |
| AC-07 | Saved views support RIU module filtering | P0 |
| AC-08 | Natural language queries understand RIU vs Case distinction | P1 |
| AC-09 | Campaign completion rates calculated from RIU responses | P0 |
| AC-10 | Disclosure escalation rates trackable (% creating Cases) | P0 |
| AC-11 | Channel breakdown shows all RIU source channels | P0 |
| AC-12 | Anonymous vs identified ratio reportable | P0 |
| AC-13 | Time from RIU creation to Case creation measurable | P1 |
| AC-14 | QA turnaround time (hotline RIUs) reportable | P1 |
| AC-15 | Cross-pillar intelligence dashboard shows subject patterns | P2 |

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Dashboard and report configurations stored as JSON
- [x] Execution history with audit context
- [x] Source tracking for fact table refresh
- [x] RIU and Case fact tables separate (input vs response)

**Feature Design:**
- [x] Natural language query examples documented
- [x] AI assistance points identified (insights, summaries, anomalies)
- [x] AI-generated board report narratives
- [x] RIU→Case conversion analytics included

**API Design:**
- [x] Context-rich responses for widgets
- [x] Bulk query support via aggregation endpoints
- [x] Separate endpoints for RIU and Case analytics

**UI Design:**
- [x] AI insight panels on dashboards
- [x] Self-service configuration (drag-and-drop)
- [x] RIU dashboard templates included
- [x] Conversion dashboard template included

### RIU Architecture Compliance

- [x] RIU fact table tracks immutable input metrics
- [x] Case fact table tracks mutable response metrics
- [x] Conversion metrics link RIU→Case relationship
- [x] Campaign metrics connect to RIU responses
- [x] Board reports distinguish inputs from outcomes
- [x] API endpoints separate RIU and Case analytics

---

*End of Analytics & Reporting PRD*
