# Ethico Risk Intelligence Platform
## PRD-007: Analytics & Reporting

**Document ID:** PRD-007
**Version:** 4.0 (Complete Specification)
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
- UI/UX Design System: `00-PLATFORM/UI-UX-DESIGN-SYSTEM.md`

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
9. [Migration Considerations](#migration-considerations)
10. [Integration Points](#integration-points)
11. [Non-Functional Requirements](#non-functional-requirements)
12. [Acceptance Criteria](#acceptance-criteria)
13. [Checklist Verification](#checklist-verification)

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

### AI Query Parsing Architecture

The natural language query system uses a multi-stage pipeline:

```
User Query → Intent Classification → Entity Extraction → Query Builder → Execution → Response Generation
```

**Stage 1: Intent Classification**
```typescript
enum QueryIntent {
  COUNT_METRIC      // "How many..."
  AVERAGE_METRIC    // "What's the average..."
  TREND_ANALYSIS    // "Show trend...", "Over time..."
  COMPARISON        // "Compare...", "vs..."
  BREAKDOWN         // "By category...", "By region..."
  ANOMALY_DETECTION // "Anything unusual...", "Outliers..."
  REPORT_CREATION   // "Create a report...", "Generate..."
  FILTER_REFINEMENT // "Only open cases...", "Exclude..."
}
```

**Stage 2: Entity Extraction**
```typescript
interface ExtractedEntities {
  dataSource: 'RIU' | 'CASE' | 'DISCLOSURE' | 'ATTESTATION' | 'CAMPAIGN';
  metrics: string[];           // ["count", "avg_days_open"]
  dimensions: string[];        // ["category", "region"]
  filters: FilterCondition[];  // [{field: "status", op: "=", value: "OPEN"}]
  timeRange: TimeRange;        // {start: "2025-10-01", end: "2025-12-31"}
  comparison?: ComparisonType; // "previous_period" | "previous_year"
}
```

**Stage 3: Query Generation**
AI generates structured query from extracted entities:
```json
{
  "dataSource": "FACT_CASE_DAILY",
  "select": [
    {"field": "category_name", "alias": "Category"},
    {"aggregation": "AVG", "field": "days_to_close", "alias": "Avg Days"}
  ],
  "where": [
    {"field": "category_code", "operator": "=", "value": "HARASSMENT"},
    {"field": "date_id", "operator": ">=", "value": "2025-10-01"}
  ],
  "groupBy": ["category_name"],
  "orderBy": [{"field": "Avg Days", "direction": "DESC"}]
}
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

### AI-Generated Insights

For each dashboard or report, AI can generate:

**Automatic Insights:**
```typescript
interface AIInsight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  comparisonValue?: number;
  changePercent?: number;
  recommendation?: string;
  relatedWidgets: string[];
  generatedAt: DateTime;
  modelVersion: string;
}

enum InsightType {
  TREND_CHANGE       // Significant increase/decrease
  ANOMALY            // Outlier detection
  THRESHOLD_BREACH   // SLA or target exceeded
  PATTERN            // Recurring pattern identified
  CORRELATION        // Related metrics moving together
  FORECAST           // Predicted future value
}
```

**Example Insights:**
- "Harassment cases are up 23% this quarter compared to last quarter"
- "Your APAC region has 3x the average case volume - investigate potential hotspot"
- "5 employees have appeared as subjects in multiple cases this year"
- "Disclosure completion rate dropped below 80% threshold"
- "Based on current trends, you may exceed SLA targets by end of quarter"

### Anomaly Detection

The system automatically detects anomalies using statistical methods:

```typescript
interface AnomalyDetectionConfig {
  method: 'z_score' | 'iqr' | 'isolation_forest' | 'prophet';
  sensitivity: 'low' | 'medium' | 'high';
  lookbackPeriod: number; // days
  minimumDataPoints: number;
}

interface DetectedAnomaly {
  metric: string;
  timestamp: DateTime;
  expectedValue: number;
  actualValue: number;
  deviationPercent: number;
  confidence: number;
  possibleCauses: string[];
}
```

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

**Configure role-based default dashboards**
As a **System Admin**, I want to configure default dashboards for each role
so that users see relevant metrics immediately upon first login.

Key behaviors:
- Assign default dashboard per role (CCO, Investigator, Triage Lead, etc.)
- Users can override with personal preference
- New users automatically see role-appropriate dashboard
- Update role defaults without affecting existing user preferences
- Activity logged: role_default_dashboard_set

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
   - Undo/redo support (Ctrl+Z/Ctrl+Y)
   - Keyboard shortcuts for common actions

2. **Widget Palette**
   - Categorized widget types
   - Drag to add to canvas
   - Widget preview on hover
   - Search/filter widgets

3. **Widget Configuration**
   - Data source selection
   - Metric/dimension configuration
   - Display options (colors, labels, formatting)
   - Drill-down settings
   - Conditional formatting rules

4. **Dashboard Settings**
   - Name, description
   - Sharing permissions
   - Auto-refresh interval
   - Global filters
   - Theme (light/dark)

**User Flow:**
1. User clicks "Create Dashboard"
2. Empty canvas displays with widget palette
3. User drags widgets from palette to canvas
4. User configures each widget via side panel
5. User previews with sample data
6. User saves dashboard

**Business Rules:**
- Maximum 20 widgets per dashboard
- Widgets cannot overlap
- Minimum widget size: 2 columns x 1 row
- Maximum widget size: 12 columns x 8 rows
- Dashboard names must be unique per user
- Shared dashboards require explicit permission grant

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save dashboard |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Remove selected widget |
| Ctrl+D | Duplicate selected widget |
| Ctrl+A | Select all widgets |
| Arrow keys | Move selected widget |

---

### F2: Widget Library

**Description:**
Pre-built widget types for common metrics and visualizations.

**Widget Categories:**

#### Metric Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Metric Card | Single number with trend | KPIs, counts | Metric, comparison period, trend direction indicator |
| Metric Comparison | Two values side-by-side | Period comparison | Two metrics, labels, change calculation |
| Gauge | Progress toward target | Goal tracking | Current value, target, thresholds (warning, danger) |
| Sparkline | Compact trend line | Quick trends | Metric, time range, granularity |

#### Chart Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Bar Chart | Vertical bars | Category comparison | Dimension, metric, sort order, max bars |
| Horizontal Bar | Horizontal bars | Ranked lists | Dimension, metric, sort order |
| Line Chart | Time series | Trends over time | Time dimension, metrics, interpolation |
| Area Chart | Filled line chart | Cumulative trends | Time dimension, metric, stacked option |
| Pie Chart | Proportions | Distribution (5 categories max) | Dimension, metric, "Other" threshold |
| Donut Chart | Pie with center hole | Distribution with total | Dimension, metric, center label |
| Stacked Bar | Multi-series bars | Part-to-whole comparison | Dimension, series, metrics |
| Heatmap | Color-coded grid | Two-dimension patterns | X dimension, Y dimension, metric, color scale |
| Funnel | Stage progression | Process flow | Stages, metric, conversion labels |
| Scatter Plot | Correlation analysis | Two-variable relationship | X metric, Y metric, size metric, color dimension |

#### Table Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Data Table | Sortable, paginated table | Detailed data | Columns, sort, page size, conditional formatting |
| Pivot Table | Grouped aggregations | Cross-tabulation | Rows, columns, values, totals |
| Leaderboard | Ranked list with metrics | Top/bottom performers | Dimension, metric, rank count, bars |

#### List Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Recent Activity | Recent items with details | Activity monitoring | Entity type, fields, limit, time format |
| Top N List | Ranked items | Highlights | Dimension, metric, N count |
| Alert List | Items needing attention | Action items | Alert conditions, severity icons, actions |

#### Geographic Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Choropleth Map | Color-coded regions | Regional distribution | Geography level (country/state), metric, color scale |
| Bubble Map | Sized markers on map | Location volume | Latitude/longitude, metric for size, color dimension |

#### Timeline Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Gantt Chart | Time-based bars | Project timelines | Entity, start date, end date, grouping |
| Calendar Heatmap | Day-by-day view | Daily patterns | Date, metric, color scale |
| Event Timeline | Chronological events | Activity history | Entity, timestamp, event type, details |

#### Special Widgets
| Widget | Description | Best For | Configuration |
|--------|-------------|----------|---------------|
| Text Block | Markdown content | Instructions, context | Markdown content, heading level |
| Embedded | External content | Integrations | URL, height, refresh |
| AI Insights | Auto-generated insights | Executive summary | Data sources, insight types, max items |

**Widget Data Configuration:**

```typescript
interface WidgetQueryConfig {
  // Data source
  factTable: 'FACT_RIU_DAILY' | 'FACT_CASE_DAILY' | 'FACT_CAMPAIGN_DAILY' | 'FACT_RIU_CASE_CONVERSION';

  // Metrics to calculate
  metrics: {
    field: string;
    aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT';
    alias: string;
    format?: 'number' | 'percent' | 'currency' | 'duration';
  }[];

  // Dimensions to group by
  dimensions?: {
    field: string;
    alias: string;
    sort?: 'asc' | 'desc';
    limit?: number;
  }[];

  // Filters
  filters?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'between';
    value: any;
  }[];

  // Time configuration
  timeField?: string;
  timeGranularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';

  // Comparison
  comparison?: {
    type: 'previous_period' | 'previous_year' | 'custom';
    customRange?: { start: string; end: string };
  };
}
```

**Widget Display Configuration:**

```typescript
interface WidgetDisplayConfig {
  // Chart configuration
  chart?: {
    colors: string[];
    showLegend: boolean;
    legendPosition: 'top' | 'bottom' | 'left' | 'right';
    showLabels: boolean;
    showValues: boolean;
    showGrid: boolean;
    animation: boolean;
  };

  // Metric configuration
  metric?: {
    format: 'number' | 'percent' | 'currency' | 'duration';
    prefix?: string;
    suffix?: string;
    decimals?: number;
    trendComparison: 'previous_period' | 'previous_year' | 'target';
    positiveIsGood: boolean;
    thresholds?: { warning: number; danger: number };
  };

  // Table configuration
  table?: {
    showPagination: boolean;
    pageSize: number;
    sortable: boolean;
    showTotals: boolean;
    striped: boolean;
    compact: boolean;
  };

  // Conditional formatting
  conditionalFormatting?: {
    rules: {
      field: string;
      condition: 'gt' | 'lt' | 'eq' | 'between';
      value: any;
      style: { backgroundColor?: string; color?: string; fontWeight?: string };
    }[];
  };
}
```

**Drill-Down Behavior:**

Each widget supports drill-down to reveal underlying data:

```typescript
interface DrillDownConfig {
  enabled: boolean;

  // Where to drill to
  target: 'modal' | 'new_tab' | 'side_panel' | 'navigate';
  targetUrl?: string; // For navigate

  // What data to show
  detailColumns: string[];

  // How to filter
  inheritFilters: boolean;
  additionalFilters?: FilterCondition[];

  // Pagination
  pageSize: number;
  maxRows: number;
}
```

---

### F3: Report Builder

**Description:**
Visual interface for building custom reports across all data sources.

**Components:**

1. **Field Selector**
   - Grouped by module (RIUs, Cases, Disclosures, etc.)
   - Searchable field list
   - Drag fields to columns
   - Shows field type icons (text, number, date, boolean)
   - Field descriptions on hover

2. **Filter Builder**
   - Visual filter conditions
   - AND/OR logic groups with nesting
   - Date range picker with presets
   - Relative dates (Last 30 days, This quarter)
   - Dynamic filters (My Cases, My Department)
   - Filter templates for common scenarios

3. **Grouping Configuration**
   - Drag fields to group by
   - Multiple levels supported (up to 5)
   - Show subtotals option
   - Collapse/expand groups in preview

4. **Calculated Fields**
   - Formula builder with syntax highlighting
   - Common functions (COUNT, SUM, AVG, IF, CASE, DATE_DIFF, etc.)
   - Field references with autocomplete
   - Preview calculation with sample data
   - Save as reusable calculated field

5. **Live Preview**
   - First 10 rows displayed
   - Updates as configuration changes
   - Performance indicator (estimated query time)
   - Sample data warning when applicable

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

**Calculated Field Functions:**

| Category | Functions |
|----------|-----------|
| Aggregate | COUNT, SUM, AVG, MIN, MAX, DISTINCT_COUNT |
| Math | ROUND, FLOOR, CEIL, ABS, MOD, POWER |
| String | CONCAT, UPPER, LOWER, TRIM, SUBSTRING, LENGTH |
| Date | DATE_DIFF, DATE_ADD, DATE_TRUNC, EXTRACT, NOW |
| Logic | IF, CASE, COALESCE, NULLIF, AND, OR, NOT |
| Conversion | CAST, TO_DATE, TO_NUMBER, FORMAT |

**Example Calculated Fields:**

```
// Days overdue (negative = early)
DATE_DIFF('day', due_date, COALESCE(completed_date, NOW()))

// SLA status
CASE
  WHEN days_open <= sla_target THEN 'On Track'
  WHEN days_open <= sla_target * 1.2 THEN 'Warning'
  ELSE 'Breached'
END

// Substantiation rate
ROUND(COUNT(IF(outcome = 'SUBSTANTIATED', 1, NULL)) * 100.0 / COUNT(*), 1)
```

**Report Templates:**

Pre-built report configurations users can start from:

| Template | Description | Data Sources | Default Columns |
|----------|-------------|--------------|-----------------|
| RIU Volume Report | Input metrics by channel, category, period | FACT_RIU_DAILY | Date, Channel, Category, Count, % Change |
| Case Detail Export | Full case data with linked RIUs | Cases, RIU_Case_Associations | Case #, RIU #, Category, Status, Assignee, Days Open |
| Investigation Summary | Outcomes, durations, investigator metrics | Investigations | Investigator, Case Count, Avg Days, Substantiation Rate |
| Disclosure Audit Trail | Campaign responses with escalation tracking | Disclosures, Campaigns | Employee, Campaign, Submitted, Decision, Escalated |
| Attestation Compliance | Completion rates by policy, department | Attestations | Policy, Department, Total, Completed, Overdue, Rate |
| User Activity Report | Login frequency, actions taken | Audit Log | User, Last Login, Action Count, Recent Actions |
| SLA Performance Report | Response times, breach rates | Cases | Category, Target Days, Avg Days, Breach Count, Rate |
| Category Analysis | Trends by category across RIUs and Cases | FACT_RIU_DAILY, FACT_CASE_DAILY | Category, RIU Count, Case Count, Substantiation Rate |
| Regional Breakdown | Location-based input and response metrics | Cases, RIUs | Region, Location, Report Count, Case Count, Avg Days |
| RIU→Case Conversion | Escalation patterns, processing times | FACT_RIU_CASE_CONVERSION | RIU Type, Channel, Total RIUs, Cases Created, Rate, Avg Time |

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
- Drag to reorder tabs

**Default System Views:**
| Module | Default Views |
|--------|---------------|
| RIUs | All RIUs, By Channel, Pending QA, High Severity, Recent |
| Cases | All Cases, My Cases, Unassigned, High Severity, Overdue |
| Investigations | My Investigations, In Progress, Pending Review |
| Disclosures | Pending Approval, My Disclosures, Threshold Exceeded, Recent |
| Attestations | Overdue, Pending, By Department |
| Campaigns | Active Campaigns, Low Completion, Overdue |

**View Configuration:**

```typescript
interface SavedViewConfig {
  // Column configuration
  columns: {
    field: string;
    width: number;
    visible: boolean;
    sortOrder?: number;
  }[];

  // Filter configuration
  filters: {
    field: string;
    operator: string;
    value: any;
    isQuickFilter: boolean; // Appears in filter bar
  }[];

  // Sort configuration
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  }[];

  // Display options
  displayOptions: {
    showCountBadge: boolean;
    compactMode: boolean;
    groupBy?: string;
  };
}
```

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
4. User reviews and edits each section
5. User customizes branding (logo, colors)
6. Export to PowerPoint or PDF

**AI Capabilities:**
- Generate executive summary (2-3 paragraphs)
- Distinguish input trends (RIUs) from response metrics (Cases)
- Identify key trends and anomalies
- Compare to previous period automatically
- Suggest areas of concern
- Plain-language insights (no jargon)
- Highlight RIU→Case conversion patterns

**Board Report Schema:**

```typescript
interface BoardReport {
  id: string;
  organizationId: string;

  // Identity
  title: string;
  templateType: 'QUARTERLY_REVIEW' | 'ANNUAL_REPORT' | 'HOTLINE_STATS' | 'RISK_INTELLIGENCE';

  // Period
  periodStart: DateTime;
  periodEnd: DateTime;
  comparisonPeriodStart?: DateTime;
  comparisonPeriodEnd?: DateTime;

  // Content
  sections: BoardReportSection[];

  // AI-generated content
  executiveSummary: string;
  keyInsights: string[];
  recommendations: string[];
  aiGeneratedAt: DateTime;
  aiModelVersion: string;

  // Branding
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Status
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED';

  // Audit
  createdById: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  finalizedAt?: DateTime;
}

interface BoardReportSection {
  id: string;
  order: number;
  title: string;
  type: 'TEXT' | 'CHART' | 'TABLE' | 'METRIC_GRID';
  content: any; // Section-specific content
  aiNarrative?: string;
  userEdited: boolean;
}
```

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
| Microsoft Teams | Link + preview | Requires integration |

**Features:**
- Timezone-aware scheduling (uses organization timezone)
- Dynamic recipients (role-based)
- Execution history with status
- Retry on failure (3 attempts with exponential backoff)
- Pause/resume capability
- Skip if no data option
- Conditional delivery (only if threshold met)

**Schedule Configuration:**

```typescript
interface ReportScheduleConfig {
  // Schedule timing
  scheduleType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CRON';
  cronExpression?: string;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  monthOfQuarter?: number; // 1-3
  timeOfDay: string; // "09:00" in 24h format
  timezone: string; // "America/New_York"

  // Delivery
  deliveryMethod: 'EMAIL' | 'SLACK' | 'SFTP' | 'WEBHOOK' | 'TEAMS';
  recipients: string[]; // Email addresses or channel IDs
  recipientRoles?: UserRole[]; // Dynamic recipients

  // Format
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeSummary: boolean;
  includeCharts: boolean;

  // Conditions
  skipIfEmpty: boolean;
  minRowsThreshold?: number;
  conditionalDelivery?: {
    field: string;
    operator: string;
    value: any;
  };

  // Retry
  maxRetries: number;
  retryDelayMinutes: number;
}
```

---

### F7: Export Capabilities

**Description:**
Export data and reports in multiple formats.

**Formats:**

| Format | Use Case | Max Rows | Notes |
|--------|----------|----------|-------|
| Excel (.xlsx) | Analysis, sharing | 100,000 | Formatted, with formulas, multiple sheets |
| CSV | Data transfer | Unlimited | Raw data, UTF-8 encoded |
| PDF | Formal reports | 10,000 | Paginated, styled, charts embedded |
| PowerPoint (.pptx) | Presentations | N/A | Charts as slides, editable |
| JSON | API integration | Unlimited | Structured data |

**Export Features:**
- Column selection and ordering
- Filter preservation (exports only filtered data)
- Branding (logo, colors) for PDF/PPTX
- Page orientation (portrait/landscape)
- Header/footer customization
- Password protection (PDF, Excel)
- Watermarking (Draft, Confidential, etc.)
- PII redaction (configurable per field)

**Large Export Handling:**
- Exports >10,000 rows run async
- User notified via email/notification when complete
- Download link valid 24 hours
- Background job queue with priority
- Progress indicator for in-progress exports

**PII Redaction Configuration:**

```typescript
interface PIIRedactionConfig {
  enabled: boolean;

  // Fields to redact
  redactedFields: {
    field: string;
    redactionType: 'MASK' | 'HASH' | 'REMOVE' | 'INITIALS';
    maskPattern?: string; // e.g., "***-**-####" for SSN
  }[];

  // Redaction rules by role
  roleOverrides?: {
    role: UserRole;
    canViewPII: boolean;
  }[];

  // Audit
  logRedactions: boolean;
}
```

**Export Watermarking:**

```typescript
interface WatermarkConfig {
  enabled: boolean;
  text: string; // "CONFIDENTIAL", "DRAFT", custom
  position: 'diagonal' | 'header' | 'footer';
  opacity: number; // 0.0 - 1.0
  includeTimestamp: boolean;
  includeUsername: boolean;
}
```

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
   - Investigation pipeline funnel
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

**Role-Based Default Dashboards:**

| Role | Default Dashboard | Rationale |
|------|-------------------|-----------|
| CCO / Compliance Officer | Executive Summary | High-level view of program health |
| Investigator | Investigation Dashboard | Focus on workload and cases |
| Triage Lead | Compliance Overview + Assignment Metrics | Queue management focus |
| Department Admin | Department-scoped Compliance Overview | Filtered to their department |
| System Admin | Platform Health Dashboard | Technical metrics, user activity |
| HR Manager | Attestation Tracker + Disclosure Manager | Employee compliance focus |

---

## Data Model

### Primary Entities

See `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md` for complete fact table schemas.

### Dashboard Entity

```prisma
model Dashboard {
  id                    String   @id @default(uuid())
  organizationId        String

  // Identity
  name                  String
  description           String?
  slug                  String                    // URL-safe identifier

  // Ownership
  ownerUserId           String
  ownerType             DashboardOwnerType        // USER, TEAM, SYSTEM

  // Sharing
  isDefault             Boolean  @default(false)  // Org default dashboard
  isShared              Boolean  @default(false)  // Visible to org
  sharedWithRoles       UserRole[]                // Specific role access
  sharedWithUserIds     String[]                  // Specific user access

  // Layout
  layoutType            DashboardLayoutType       // GRID, FREEFORM
  layout                Json                      // Widget positions
  columnCount           Int      @default(12)    // Grid columns
  rowHeight             Int      @default(50)    // Row height in pixels

  // Filters
  globalFilters         Json?                     // Filters applied to all widgets
  dateRangeType         DateRangeType?            // LAST_7_DAYS, etc.
  customDateStart       DateTime?
  customDateEnd         DateTime?

  // Behavior
  autoRefresh           Boolean  @default(true)
  refreshIntervalSeconds Int?    @default(300)   // 5 minutes

  // AI Features
  aiInsightsEnabled     Boolean  @default(true)
  lastAiInsightAt       DateTime?

  // Metadata
  viewCount             Int      @default(0)
  lastViewedAt          DateTime?

  // Activity log support
  notes                 String?                   // User notes about this dashboard

  // Migration support
  sourceSystem          String?
  sourceRecordId        String?
  migratedAt            DateTime?

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdById           String
  updatedById           String

  // Relations
  widgets               DashboardWidget[]
  organization          Organization @relation(fields: [organizationId], references: [id])
  owner                 User @relation("DashboardOwner", fields: [ownerUserId], references: [id])
  createdBy             User @relation("DashboardCreatedBy", fields: [createdById], references: [id])
  updatedBy             User @relation("DashboardUpdatedBy", fields: [updatedById], references: [id])

  // Indexes
  @@unique([organizationId, slug])
  @@index([organizationId])
  @@index([organizationId, ownerUserId])
  @@index([organizationId, isShared])
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

### Dashboard Widget Entity

```prisma
model DashboardWidget {
  id                    String   @id @default(uuid())
  dashboardId           String

  // Identity
  title                 String
  description           String?

  // Widget Type
  widgetType            WidgetType
  subtype               String?                   // Chart subtype, etc.

  // Data Source
  dataSource            WidgetDataSource          // Which fact table
  queryConfig           Json                      // Filters, grouping, etc.

  // Display Configuration
  displayConfig         Json                      // Colors, labels, formatting

  // Position (grid-based)
  positionX             Int      @default(0)     // Grid column
  positionY             Int      @default(0)     // Grid row
  width                 Int      @default(4)     // Columns spanned
  height                Int      @default(2)     // Rows spanned

  // Behavior
  refreshIndependently  Boolean  @default(false)
  refreshIntervalSeconds Int?

  // Drill-down
  drillDownEnabled      Boolean  @default(true)
  drillDownConfig       Json?                     // Drill-down settings

  // Conditional visibility
  visibilityConditions  Json?                     // Show/hide based on data

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  dashboard             Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)
}

enum WidgetType {
  // Metrics
  METRIC_CARD
  METRIC_COMPARISON
  GAUGE
  SPARKLINE

  // Charts
  BAR_CHART
  HORIZONTAL_BAR
  LINE_CHART
  AREA_CHART
  PIE_CHART
  DONUT_CHART
  STACKED_BAR
  FUNNEL_CHART
  HEATMAP
  SCATTER_PLOT

  // Tables
  DATA_TABLE
  PIVOT_TABLE
  LEADERBOARD

  // Lists
  RECENT_LIST
  TOP_N_LIST
  ALERT_LIST

  // Geographic
  CHOROPLETH_MAP
  BUBBLE_MAP

  // Timeline
  GANTT_CHART
  CALENDAR_HEATMAP
  EVENT_TIMELINE

  // Special
  TEXT_BLOCK
  IFRAME
  AI_INSIGHTS
}

enum WidgetDataSource {
  FACT_RIU_DAILY
  FACT_CASE_DAILY
  FACT_CAMPAIGN_DAILY
  FACT_RIU_CASE_CONVERSION
  CASE_FACT           // Legacy
  DISCLOSURE_FACT
  FORM_FACT
  ATTESTATION_FACT
  AUDIT_LOG
  CUSTOM_QUERY
}
```

### Report Entity

```prisma
model Report {
  id                    String   @id @default(uuid())
  organizationId        String

  // Identity
  name                  String
  description           String?

  // Ownership
  ownerUserId           String
  isShared              Boolean  @default(false)
  sharedWithRoles       UserRole[]
  sharedWithUserIds     String[]

  // Data Configuration
  dataSources           ReportDataSource[]        // Which modules/facts
  columns               Json                      // Field selections
  filters               Json                      // Filter conditions
  grouping              Json?                     // Group by configuration
  sort                  Json?                     // Sort configuration

  // Calculations
  calculatedFields      Json?                     // Custom formulas
  subtotals             Boolean  @default(false)
  grandTotals           Boolean  @default(true)

  // Display
  columnWidths          Json?                     // Per-column widths
  conditionalFormatting Json?                     // Highlight rules

  // Export Defaults
  defaultFormat         ReportFormat @default(EXCEL)
  includeHeaders        Boolean  @default(true)

  // Template
  isTemplate            Boolean  @default(false)  // System template
  templateCategory      String?                   // Template grouping

  // Activity log support
  notes                 String?

  // Migration support
  sourceSystem          String?
  sourceRecordId        String?
  migratedAt            DateTime?

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdById           String
  updatedById           String

  // Relations
  schedules             ReportSchedule[]
  executions            ReportExecution[]
  organization          Organization @relation(fields: [organizationId], references: [id])
  owner                 User @relation("ReportOwner", fields: [ownerUserId], references: [id])

  // Indexes
  @@index([organizationId])
  @@index([organizationId, ownerUserId])
  @@index([organizationId, isShared])
  @@index([organizationId, isTemplate])
}

enum ReportDataSource {
  RIUS
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  USERS
  EMPLOYEES
  AUDIT_LOG
  FORMS
  CAMPAIGNS
}

enum ReportFormat {
  PDF
  EXCEL
  CSV
  POWERPOINT
  JSON
}
```

### Report Schedule Entity

```prisma
model ReportSchedule {
  id                    String   @id @default(uuid())
  reportId              String
  organizationId        String

  // Identity
  name                  String?                   // Optional schedule name

  // Schedule
  scheduleType          ScheduleType
  cronExpression        String?                   // For CRON type
  dayOfWeek             Int?                      // 0-6 for weekly
  dayOfMonth            Int?                      // 1-31 for monthly
  monthOfQuarter        Int?                      // 1-3 for quarterly
  timeOfDay             String                    // "09:00" in org timezone
  timezone              String                    // IANA timezone

  // Delivery
  deliveryMethod        DeliveryMethod
  recipients            String[]                  // Email addresses
  recipientRoles        UserRole[]                // Dynamic role-based
  slackChannel          String?                   // For Slack delivery
  sftpConfig            Json?                     // SFTP connection details
  webhookUrl            String?                   // For webhook delivery

  // Format
  format                ReportFormat
  includeSummary        Boolean  @default(true)
  includeCharts         Boolean  @default(true)

  // Filters (override report defaults)
  filterOverrides       Json?
  dateRangeType         DateRangeType

  // Conditions
  skipIfEmpty           Boolean  @default(false)
  minRowsThreshold      Int?
  conditionalDelivery   Json?                     // Condition for sending

  // Retry configuration
  maxRetries            Int      @default(3)
  retryDelayMinutes     Int      @default(15)

  // Status
  isActive              Boolean  @default(true)
  lastRunAt             DateTime?
  nextRunAt             DateTime?
  lastRunStatus         ScheduleRunStatus?
  lastRunError          String?
  consecutiveFailures   Int      @default(0)

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdById           String

  // Relations
  report                Report @relation(fields: [reportId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([organizationId])
  @@index([organizationId, isActive, nextRunAt])
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
  TEAMS
}

enum ScheduleRunStatus {
  SUCCESS
  FAILED
  PARTIAL
  CANCELLED
  SKIPPED
}
```

### Report Execution Entity

```prisma
model ReportExecution {
  id                    String   @id @default(uuid())
  reportId              String
  organizationId        String

  // Trigger
  triggeredBy           ReportTrigger
  triggeredByUserId     String?
  scheduleId            String?

  // Execution
  startedAt             DateTime @default(now())
  completedAt           DateTime?
  durationMs            Int?

  // Results
  status                ReportExecutionStatus
  rowCount              Int?
  errorMessage          String?
  errorDetails          Json?

  // Output
  outputFormat          ReportFormat?
  outputFileUrl         String?                   // For cached exports
  outputFileSizeBytes   Int?
  outputExpiresAt       DateTime?                 // Cache expiration

  // Filters Used
  filtersApplied        Json?                     // Actual filters for this run
  dateRangeStart        DateTime?
  dateRangeEnd          DateTime?

  // Relations
  report                Report @relation(fields: [reportId], references: [id])

  // Index
  @@index([organizationId, reportId, startedAt])
  @@index([organizationId, startedAt])
  @@index([organizationId, status])
}

enum ReportTrigger {
  MANUAL
  SCHEDULED
  API
  EXPORT
}

enum ReportExecutionStatus {
  QUEUED
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
  TIMEOUT
}
```

### Saved View Entity

```prisma
model SavedView {
  id                    String   @id @default(uuid())
  organizationId        String
  userId                String

  // Identity
  name                  String
  module                ViewModule                // CASES, INVESTIGATIONS, etc.

  // Configuration
  columns               Json                      // Visible columns
  filters               Json                      // Filter conditions
  sort                  Json                      // Sort configuration
  displayOptions        Json?                     // Additional display settings

  // Display
  sortOrder             Int      @default(0)     // Tab order
  isPinned              Boolean  @default(false)
  showCountBadge        Boolean  @default(true)

  // Sharing
  isShared              Boolean  @default(false)
  sharedWithRoles       UserRole[]

  // Default
  isDefault             Boolean  @default(false)  // User's default for module

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  organization          Organization @relation(fields: [organizationId], references: [id])
  user                  User @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId, name, module])
  @@index([organizationId, userId, module])
}

enum ViewModule {
  RIUS
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  CAMPAIGNS
  USERS
  EMPLOYEES
}
```

### AI Insight Entity

```prisma
model AIInsight {
  id                    String   @id @default(uuid())
  organizationId        String

  // Context
  dashboardId           String?
  reportId              String?
  widgetId              String?

  // Insight details
  insightType           InsightType
  severity              InsightSeverity
  title                 String
  description           String                    // Natural language explanation

  // Metrics
  metric                String
  currentValue          Float
  comparisonValue       Float?
  changePercent         Float?
  threshold             Float?

  // AI generation
  recommendation        String?
  confidenceScore       Float                     // 0.0 - 1.0
  aiModelVersion        String

  // User feedback
  wasHelpful            Boolean?
  userFeedback          String?

  // Status
  isAcknowledged        Boolean  @default(false)
  acknowledgedAt        DateTime?
  acknowledgedById      String?

  // Timestamps
  generatedAt           DateTime @default(now())
  expiresAt             DateTime?                 // When insight becomes stale

  // Relations
  dashboard             Dashboard? @relation(fields: [dashboardId], references: [id])
  report                Report? @relation(fields: [reportId], references: [id])

  @@index([organizationId, generatedAt])
  @@index([organizationId, dashboardId])
  @@index([organizationId, insightType])
}

enum InsightType {
  TREND_CHANGE
  ANOMALY
  THRESHOLD_BREACH
  PATTERN
  CORRELATION
  FORECAST
}

enum InsightSeverity {
  INFO
  WARNING
  CRITICAL
}
```

### Analytics Activity Log Entity

```prisma
model AnalyticsActivity {
  id                    String   @id @default(uuid())
  organizationId        String

  // Entity reference
  entityType            AnalyticsEntityType
  entityId              String

  // Action
  action                String                    // created, updated, shared, exported, etc.
  actionDescription     String                    // Natural language description

  // Actor
  actorUserId           String?
  actorType             ActorType

  // Changes
  changes               Json?                     // { oldValue, newValue, fieldsChanged }
  context               Json?                     // Additional context

  // Metadata
  ipAddress             String?
  userAgent             String?

  // Timestamps
  createdAt             DateTime @default(now())

  // Indexes
  @@index([organizationId, entityType, entityId, createdAt])
  @@index([organizationId, actorUserId, createdAt])
  @@index([organizationId, createdAt])
}

enum AnalyticsEntityType {
  DASHBOARD
  WIDGET
  REPORT
  SCHEDULE
  VIEW
  BOARD_REPORT
  EXPORT
}

enum ActorType {
  USER
  SYSTEM
  AI
  INTEGRATION
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
PUT    /api/v1/dashboards/:id/widgets/layout # Batch update positions

# Widget Data
POST   /api/v1/widgets/:id/data              # Fetch widget data
POST   /api/v1/widgets/preview               # Preview widget config

# Dashboard Sharing
POST   /api/v1/dashboards/:id/share          # Share dashboard
DELETE /api/v1/dashboards/:id/share/:userId  # Revoke user access
POST   /api/v1/dashboards/:id/set-default    # Set as org/role default
```

**Create Dashboard Request:**
```typescript
interface CreateDashboardRequest {
  name: string;
  description?: string;
  layoutType?: 'GRID' | 'FREEFORM';
  globalFilters?: FilterCondition[];
  dateRangeType?: DateRangeType;
  autoRefresh?: boolean;
  refreshIntervalSeconds?: number;
  templateId?: string; // Clone from template
}
```

**Create Dashboard Response:**
```typescript
interface DashboardResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  slug: string;
  ownerUserId: string;
  ownerType: DashboardOwnerType;
  isShared: boolean;
  layoutType: DashboardLayoutType;
  columnCount: number;
  globalFilters?: FilterCondition[];
  dateRangeType?: DateRangeType;
  autoRefresh: boolean;
  refreshIntervalSeconds?: number;
  widgets: WidgetResponse[];
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
}
```

**Add Widget Request:**
```typescript
interface CreateWidgetRequest {
  title: string;
  description?: string;
  widgetType: WidgetType;
  subtype?: string;
  dataSource: WidgetDataSource;
  queryConfig: WidgetQueryConfig;
  displayConfig: WidgetDisplayConfig;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  drillDownEnabled?: boolean;
  drillDownConfig?: DrillDownConfig;
}
```

**Widget Data Request:**
```typescript
interface WidgetDataRequest {
  // Override dashboard filters
  filters?: FilterCondition[];
  dateRange?: {
    start: string;
    end: string;
  };
  // Comparison
  includeComparison?: boolean;
  comparisonType?: 'previous_period' | 'previous_year';
}
```

**Widget Data Response:**
```typescript
interface WidgetDataResponse {
  widgetId: string;
  data: {
    series: DataSeries[];
    summary?: MetricSummary;
  };
  comparison?: {
    series: DataSeries[];
    summary?: MetricSummary;
    changePercent: number;
  };
  metadata: {
    rowCount: number;
    queryDurationMs: number;
    dataAsOf: string;
    nextRefreshAt?: string;
  };
}

interface DataSeries {
  name: string;
  data: DataPoint[];
}

interface DataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

interface MetricSummary {
  total: number;
  average?: number;
  min?: number;
  max?: number;
}
```

### Report Endpoints

```
# Report CRUD
GET    /api/v1/reports                       # List reports
POST   /api/v1/reports                       # Create report
GET    /api/v1/reports/:id                   # Get report definition
PUT    /api/v1/reports/:id                   # Update report
DELETE /api/v1/reports/:id                   # Delete report
POST   /api/v1/reports/:id/duplicate         # Clone report

# Report Execution
POST   /api/v1/reports/:id/execute           # Run report
GET    /api/v1/reports/:id/preview           # Preview (first 10 rows)
GET    /api/v1/reports/:id/executions        # List past executions
GET    /api/v1/reports/:id/executions/:eid   # Get execution result
POST   /api/v1/reports/:id/export            # Export report

# Scheduled Reports
GET    /api/v1/reports/:id/schedules         # List schedules
POST   /api/v1/reports/:id/schedules         # Create schedule
PUT    /api/v1/schedules/:sid                # Update schedule
DELETE /api/v1/schedules/:sid                # Delete schedule
POST   /api/v1/schedules/:sid/run-now        # Trigger immediate run
POST   /api/v1/schedules/:sid/pause          # Pause schedule
POST   /api/v1/schedules/:sid/resume         # Resume schedule
```

**Create Report Request:**
```typescript
interface CreateReportRequest {
  name: string;
  description?: string;
  dataSources: ReportDataSource[];
  columns: ColumnConfig[];
  filters: FilterCondition[];
  grouping?: GroupingConfig[];
  sort?: SortConfig[];
  calculatedFields?: CalculatedFieldConfig[];
  subtotals?: boolean;
  grandTotals?: boolean;
  defaultFormat?: ReportFormat;
}

interface ColumnConfig {
  source: ReportDataSource;
  field: string;
  label: string;
  width?: number;
  visible?: boolean;
  format?: string;
}

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'between' | 'isNull' | 'isNotNull';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface GroupingConfig {
  field: string;
  level: number;
  showSubtotal?: boolean;
  collapsed?: boolean;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface CalculatedFieldConfig {
  name: string;
  label: string;
  formula: string;
  format?: string;
}
```

**Execute Report Request:**
```typescript
interface ExecuteReportRequest {
  filters?: FilterCondition[];
  dateRange?: {
    start: string;
    end: string;
  };
  format?: ReportFormat;
  options?: {
    includeHeaders?: boolean;
    maxRows?: number;
    async?: boolean; // Force async execution
  };
}
```

**Execute Report Response:**
```typescript
interface ExecuteReportResponse {
  executionId: string;
  status: ReportExecutionStatus;

  // For sync execution
  data?: {
    columns: ColumnMetadata[];
    rows: any[][];
    totals?: any[];
  };

  // For async execution
  estimatedCompletionAt?: string;

  metadata: {
    rowCount: number;
    queryDurationMs: number;
    truncated: boolean;
    filters: FilterCondition[];
    dateRange?: { start: string; end: string };
  };
}
```

**Export Report Request:**
```typescript
interface ExportReportRequest {
  format: ReportFormat;
  filters?: FilterCondition[];
  dateRange?: {
    start: string;
    end: string;
  };
  options?: {
    includeHeaders?: boolean;
    includeTotals?: boolean;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'letter' | 'legal' | 'a4';
    watermark?: WatermarkConfig;
    piiRedaction?: PIIRedactionConfig;
    password?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
    };
  };
}
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

# Aggregations
POST   /api/v1/analytics/aggregate           # Generic aggregation query
GET    /api/v1/analytics/metrics/:metric     # Single metric value

# AI Insights
POST   /api/v1/analytics/ai/query            # Natural language query
POST   /api/v1/analytics/ai/insights         # Generate AI insights
POST   /api/v1/analytics/ai/anomalies        # Detect anomalies
POST   /api/v1/analytics/ai/summary          # Generate natural language summary
POST   /api/v1/analytics/ai/patterns         # Cross-case pattern detection
```

**Generic Aggregation Query:**
```typescript
interface AggregationQueryRequest {
  factTable: WidgetDataSource;
  select: {
    field: string;
    aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT';
    alias?: string;
  }[];
  where?: FilterCondition[];
  groupBy?: string[];
  having?: FilterCondition[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}
```

**AI Query Request:**
```typescript
interface AIQueryRequest {
  query: string; // Natural language query
  context?: {
    currentDashboardId?: string;
    currentFilters?: FilterCondition[];
    conversationHistory?: AIConversationMessage[];
  };
  options?: {
    generateVisualization?: boolean;
    includeInsights?: boolean;
    maxResults?: number;
  };
}

interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

**AI Query Response:**
```typescript
interface AIQueryResponse {
  // Interpreted query
  interpretation: {
    intent: QueryIntent;
    entities: ExtractedEntities;
    confidence: number;
  };

  // Results
  answer: string; // Natural language answer
  data?: {
    series: DataSeries[];
    summary?: MetricSummary;
  };

  // Visualization suggestion
  visualization?: {
    type: WidgetType;
    config: WidgetDisplayConfig;
  };

  // Insights
  insights?: AIInsight[];

  // Follow-up suggestions
  suggestedFollowUps?: string[];

  // Metadata
  metadata: {
    queryDurationMs: number;
    tokensUsed: number;
    modelVersion: string;
  };
}
```

### Saved Views Endpoints

```
GET    /api/v1/views                         # List user's views
POST   /api/v1/views                         # Create view
GET    /api/v1/views/:id                     # Get view
PUT    /api/v1/views/:id                     # Update view
DELETE /api/v1/views/:id                     # Delete view
POST   /api/v1/views/:id/set-default         # Set as default
PUT    /api/v1/views/reorder                 # Reorder tabs
```

**Create View Request:**
```typescript
interface CreateViewRequest {
  name: string;
  module: ViewModule;
  columns: {
    field: string;
    width?: number;
    visible?: boolean;
  }[];
  filters: FilterCondition[];
  sort: SortConfig[];
  displayOptions?: {
    showCountBadge?: boolean;
    compactMode?: boolean;
    groupBy?: string;
  };
  isShared?: boolean;
  sharedWithRoles?: UserRole[];
}
```

### Board Reports Endpoints

```
GET    /api/v1/board-reports                 # List board reports
POST   /api/v1/board-reports                 # Create board report
GET    /api/v1/board-reports/:id             # Get board report
PUT    /api/v1/board-reports/:id             # Update board report
DELETE /api/v1/board-reports/:id             # Delete board report
POST   /api/v1/board-reports/:id/generate    # Generate/refresh content
POST   /api/v1/board-reports/:id/export      # Export to PPTX/PDF
POST   /api/v1/board-reports/:id/finalize    # Mark as final
```

---

## UI/UX Specifications

### Navigation Placement

Analytics & Reporting appears in the main navigation as a top-level item:

```
Main Navigation
├── Home
├── Cases
├── Investigations
├── Disclosures
├── Policies
├── Analytics           ← Primary entry point
│   ├── Dashboards     (default landing)
│   ├── Reports
│   ├── Board Reports
│   └── Saved Views
└── Settings
```

### Dashboard Builder UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboards    [Dashboard Name ▼]    [Share] [Save]            │
├─────────────────────────────────────────────────────────────────────────┤
│ Global Filters: [Date Range ▼] [Business Unit ▼] [Location ▼] [Apply]   │
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
│   • Bar     │   │  ████████ Harassment    45    │ │      📈          │ │
│   • Line    │   │  ██████   Fraud         32    │ │                  │ │
│   • Pie     │   │  ████     Safety        28    │ │  [Line chart]    │ │
│   • Area    │   │  ███      Retaliation   21    │ │                  │ │
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

### Widget Configuration Panel

```
┌─────────────────────────────────────────┐
│ Configure Widget                    [X] │
├─────────────────────────────────────────┤
│ Title: [Cases by Category         ]     │
│                                         │
│ ▼ Data Source                           │
│   [FACT_CASE_DAILY              ▼]      │
│                                         │
│ ▼ Metrics                               │
│   Aggregation: [COUNT           ▼]      │
│   Field:       [*               ▼]      │
│                                         │
│ ▼ Dimensions                            │
│   Group by:    [category_name   ▼]      │
│   Limit:       [10              ▼]      │
│                                         │
│ ▼ Filters                               │
│   [+ Add filter]                        │
│   status IN [OPEN, IN_INVESTIGATION]    │
│                                         │
│ ▼ Display Options                       │
│   Chart type:  [Horizontal Bar  ▼]      │
│   Colors:      [Auto            ▼]      │
│   Show values: [✓]                      │
│   Show legend: [ ]                      │
│                                         │
│ ▼ Drill-down                            │
│   Enabled:     [✓]                      │
│   Target:      [Modal           ▼]      │
│                                         │
│                        [Cancel] [Apply] │
└─────────────────────────────────────────┘
```

### Report Builder UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Report Builder                                    [Preview] [Save] [Run]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Fields ────┐  ┌─── Columns ─────────────────────────────────────┐ │
│  │ 🔍 Search...  │  │                                                 │ │
│  │               │  │  [Case #] [Created] [Category] [Assignee]       │ │
│  │ ▼ RIUs       │  │                                                 │ │
│  │   • RIU Type │  │  Drag fields here to add columns                │ │
│  │   • Channel  │  │                                                 │ │
│  │   • Received │  └─────────────────────────────────────────────────┘ │
│  │               │                                                      │
│  │ ▼ Cases      │  ┌─── Filters ─────────────────────────────────────┐ │
│  │   • Case #   │  │                                                 │ │
│  │   • Created  │  │  Status    [is any of ▼]  [Open, In Progress]   │ │
│  │   • Status   │  │  Created   [is after ▼]   [Last 90 days]        │ │
│  │   • Category │  │  + Add filter                                   │ │
│  │   • Severity │  │                                                 │ │
│  │   • Location │  └─────────────────────────────────────────────────┘ │
│  │   • Assignee │                                                      │
│  │               │  ┌─── Grouping ───────────────────────────────────┐ │
│  │ ▼ Invest.    │  │  Group by: [Category ▼] [+ Add level]           │ │
│  │   • Status   │  │  [✓] Show subtotals                             │ │
│  │   • Outcome  │  └─────────────────────────────────────────────────┘ │
│  │   • Days     │                                                      │
│  │               │  ┌─── Preview (10 rows) ───────────────────────────┐ │
│  │ ▼ Disclosures│  │ Case #  │ Created    │ Category    │ Assignee   │ │
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

### AI Query Interface

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Ask AI                                                              [X] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  You: "What's our average time to close harassment cases?"              │
│                                                                         │
│  AI: "The average time to close harassment cases is 45 days, which is   │
│       12% higher than your overall average of 40 days."                 │
│                                                                         │
│       ┌────────────────────────────────────────────────┐                │
│       │  Average Days to Close by Category             │                │
│       │  ████████████████████████ Harassment  45 days  │                │
│       │  ██████████████████████   Fraud       42 days  │                │
│       │  ████████████████████     Safety      40 days  │                │
│       │  ██████████████           Theft       35 days  │                │
│       └────────────────────────────────────────────────┘                │
│                                                                         │
│       Would you like to:                                                │
│       • See breakdown by region?                                        │
│       • Compare to last quarter?                                        │
│       • Save this as a dashboard widget?                                │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [Ask a follow-up question...                              ] [Send]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Library (shadcn/ui)

All analytics components use shadcn/ui primitives:

| Component | shadcn/ui Base | Usage |
|-----------|----------------|-------|
| Dashboard Canvas | Custom + DnD Kit | Widget drag-and-drop |
| Widget Card | Card | Widget container |
| Filter Bar | Popover + Select | Global filters |
| Date Picker | Calendar + Popover | Date range selection |
| Chart | Recharts | All chart types |
| Data Table | Table + Pagination | Tabular data |
| Metric Card | Card + Badge | KPI display |
| Report Builder | Dialog + Tabs | Report configuration |
| View Tabs | Tabs | Saved view switching |
| AI Chat | Sheet + Input | AI query interface |

---

## Migration Considerations

### Data Mapping from Competitor Systems

| Source System | Analytics Feature | Ethico Equivalent | Migration Notes |
|---------------|-------------------|-------------------|-----------------|
| NAVEX | Saved reports | SavedReport | Map report definitions, recreate calculated fields |
| NAVEX | Scheduled reports | ReportSchedule | Map schedules, verify recipient emails |
| EQS | Dashboard widgets | DashboardWidget | Map widget types, may need manual chart type mapping |
| EQS | Export templates | Report templates | Convert to Ethico format |
| Custom BI | SQL queries | Calculated fields | Convert SQL to formula syntax |

### Handling Sparse Data

| Scenario | Challenge | Solution |
|----------|-----------|----------|
| Missing categories | Historical data lacks categories | Show "Uncategorized" bucket, AI can suggest categorization |
| Incomplete dates | Records without created_at | Use migrated_at as fallback, flag in reports |
| No outcome data | Cases without outcomes | Exclude from outcome metrics, show "Pending" |
| Missing assignee | Unassigned cases | Include in "Unassigned" counts |

### Post-Migration Analytics Enrichment

After migration, run these enrichment jobs:

1. **Fact Table Population** - Rebuild all fact tables from migrated data
2. **AI Summary Generation** - Generate summaries for historical records lacking them
3. **Trend Baseline** - Establish baseline metrics for anomaly detection
4. **Category Standardization** - Map legacy categories to new taxonomy

---

## Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Read | Case facts, status, outcomes |
| RIU Intake | Read | RIU counts, channel data, conversion metrics |
| Investigations | Read | Investigation outcomes, duration |
| Disclosures | Read | Disclosure facts, campaign completion |
| Policy Management | Read | Attestation metrics, policy versions |
| Campaigns | Read | Campaign status, completion rates |
| User Management | Read | User roles, departments (for filtering) |
| HRIS | Read | Employee data (for departmental analytics) |
| Audit Log | Read | Activity data for user reports |

### External System Integrations

| System | Integration Method | Use Case |
|--------|-------------------|----------|
| Slack | Webhook (outbound) | Scheduled report delivery |
| Microsoft Teams | Webhook (outbound) | Scheduled report delivery |
| SFTP | File transfer (outbound) | Report delivery to external systems |
| Power BI | API (export) | JSON/CSV export for Power BI ingestion |
| Email (SMTP) | Email (outbound) | Report delivery |
| SSO Provider | Authentication | User identity for report access |

### Event Publishing

Analytics module publishes events for audit and integration:

| Event | Trigger | Payload |
|-------|---------|---------|
| `dashboard.created` | Dashboard creation | Dashboard ID, owner, template used |
| `dashboard.shared` | Dashboard sharing | Dashboard ID, shared with users/roles |
| `report.executed` | Report run | Report ID, execution time, row count |
| `report.exported` | Report export | Report ID, format, recipient |
| `schedule.triggered` | Scheduled report | Schedule ID, status, delivery method |
| `ai.query.executed` | AI query | Query text (anonymized), tokens used |
| `insight.generated` | AI insight | Insight type, severity, confidence |

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Dashboard load | < 2 seconds |
| Widget refresh | < 500ms |
| Report preview | < 1 second |
| Report execution (10K rows) | < 10 seconds |
| Report export (10K rows) | < 30 seconds |
| AI query response | < 5 seconds |
| Scheduled report generation | < 5 minutes |

### Scalability

- Support 100+ concurrent dashboard viewers per organization
- Handle dashboards with 20 widgets
- Reports up to 100,000 rows
- 1,000+ scheduled reports per organization
- Fact tables with 10M+ records per organization
- 500+ saved views per organization

### Security

- All data filtered by organization_id (RLS enforced)
- Business unit scoping enforced on all queries
- Role-based dashboard and report sharing
- Audit log for all report exports
- PII redaction configurable per export
- Export downloads require re-authentication for sensitive data
- API rate limiting: 100 requests/minute per user

### Reliability

- Dashboard data cached with 5-minute TTL
- Scheduled reports retry 3x on failure with exponential backoff
- Export files stored 24 hours in blob storage
- Historical report executions retained 90 days
- Fact tables have 5-minute refresh with full daily rebuild
- 99.5% availability target for analytics API

### Caching Strategy

| Layer | TTL | Invalidation |
|-------|-----|--------------|
| Widget query results | 5 minutes | On fact table refresh |
| Dashboard layout | 1 hour | On dashboard save |
| Report preview | 1 minute | On filter change |
| AI query cache | 15 minutes | On significant data change |
| User preferences | 24 hours | On preference change |

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
| AC-07 | Saved views support all modules (RIUs, Cases, Investigations, Disclosures, Attestations) | P0 |
| AC-08 | Natural language queries understand RIU vs Case distinction | P1 |
| AC-09 | Campaign completion rates calculated from RIU responses | P0 |
| AC-10 | Disclosure escalation rates trackable (% creating Cases) | P0 |
| AC-11 | Channel breakdown shows all RIU source channels | P0 |
| AC-12 | Anonymous vs identified ratio reportable | P0 |
| AC-13 | Time from RIU creation to Case creation measurable | P1 |
| AC-14 | QA turnaround time (hotline RIUs) reportable | P1 |
| AC-15 | Cross-pillar intelligence dashboard shows subject patterns | P2 |
| AC-16 | Dashboard sharing works with role-based permissions | P0 |
| AC-17 | Scheduled reports deliver to Email, Slack, SFTP | P0 |
| AC-18 | Export supports Excel, CSV, PDF, PowerPoint formats | P0 |
| AC-19 | PII redaction works correctly in exports | P1 |
| AC-20 | AI generates actionable insights with anomaly detection | P1 |
| AC-21 | Role-based default dashboards assigned on user creation | P1 |
| AC-22 | All analytics activity logged for audit | P0 |

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Dashboard and report configurations stored as JSON
- [x] Execution history with audit context
- [x] Source tracking for fact table refresh
- [x] RIU and Case fact tables separate (input vs response)
- [x] AI enrichment fields on insights (model version, confidence)
- [x] Activity log with natural language descriptions

**Feature Design:**
- [x] Natural language query examples documented
- [x] AI assistance points identified (insights, summaries, anomalies)
- [x] AI-generated board report narratives
- [x] RIU→Case conversion analytics included
- [x] Conversation storage for AI queries
- [x] AI action audit designed

**API Design:**
- [x] Context-rich responses for widgets
- [x] Bulk query support via aggregation endpoints
- [x] Separate endpoints for RIU and Case analytics
- [x] AI query endpoint with conversation context

**UI Design:**
- [x] AI insight panels on dashboards
- [x] Self-service configuration (drag-and-drop)
- [x] RIU dashboard templates included
- [x] Conversion dashboard template included
- [x] AI chat interface designed

### RIU Architecture Compliance

- [x] RIU fact table tracks immutable input metrics
- [x] Case fact table tracks mutable response metrics
- [x] Conversion metrics link RIU→Case relationship
- [x] Campaign metrics connect to RIU responses
- [x] Board reports distinguish inputs from outcomes
- [x] API endpoints separate RIU and Case analytics

### Multi-Tenancy Compliance

- [x] All entities have organizationId field
- [x] All queries filter by organizationId
- [x] Cache keys include organizationId
- [x] Scheduled report scoped to organization
- [x] Export security respects tenant isolation

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| RIU | Risk Intelligence Unit - immutable input record |
| Fact Table | Pre-aggregated metrics table for dashboard performance |
| Widget | A single visualization component on a dashboard |
| Saved View | A persisted filter/column configuration appearing as a tab |
| Board Report | AI-assisted executive presentation |

### Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Oct 2025 | Initial draft | Product Team |
| 2.0 | Dec 2025 | Added RIU→Case framework | Product Team |
| 3.0 | Jan 2026 | RIU architecture update | Product Team |
| 4.0 | Feb 2026 | Complete specification with full schemas, API specs, AI details | Product Team |

---

*End of Analytics & Reporting PRD*
