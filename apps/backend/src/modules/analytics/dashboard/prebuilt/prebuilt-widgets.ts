import { WidgetType, ChartType, DashboardType } from "@prisma/client";
import { LayoutItem } from "../entities/dashboard-config.entity";

/**
 * Pre-built widget configuration interface.
 * Defines the complete configuration for a widget including
 * visualization type, data source, query config, and layout.
 */
export interface PrebuiltWidget {
  /** Unique identifier for this widget type */
  id: string;
  /** Widget visualization type (KPI_CARD, LINE_CHART, etc.) */
  widgetType: WidgetType;
  /** Display title for the widget */
  title: string;
  /** Data source identifier for the widget data service */
  dataSource: string;
  /** Query configuration for data fetching */
  queryConfig: PrebuiltWidgetQueryConfig;
  /** Layout configuration for react-grid-layout */
  layoutItem: Omit<LayoutItem, "i">;
  /** Chart type for visualization widgets */
  chartType?: ChartType;
  /** Optional display configuration */
  displayConfig?: PrebuiltWidgetDisplayConfig;
  /** Description for widget picker */
  description?: string;
}

/**
 * Query configuration for pre-built widgets.
 * Extends the base WidgetQueryConfig with additional pre-built specific fields.
 */
export interface PrebuiltWidgetQueryConfig {
  /** Entity type to query (case, riu, campaign, disclosure, computed) */
  entity: string;
  /** Aggregation function */
  aggregation?: "count" | "sum" | "avg" | "min" | "max";
  /** Field to aggregate on (for sum/avg/min/max) */
  aggregateField?: string;
  /** Fields to group results by */
  groupBy?: string[];
  /** Filter conditions */
  filters?: Record<string, unknown>;
  /** Sort configuration */
  orderBy?: { field: string; direction: "asc" | "desc" };
  /** Maximum number of results */
  limit?: number;
  /** Time range grouping (day, week, month) */
  timeGrouping?: "day" | "week" | "month";
}

/**
 * Display configuration for pre-built widgets.
 */
export interface PrebuiltWidgetDisplayConfig {
  /** Color palette for charts */
  colors?: string[];
  /** Label overrides for status/category values */
  labels?: Record<string, string>;
  /** Number format configuration */
  format?: {
    type?: "number" | "currency" | "percentage" | "date";
    precision?: number;
    locale?: string;
  };
  /** Show chart legend */
  showLegend?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Enable chart animations */
  animate?: boolean;
  /** KPI card specific: show trend indicator */
  showTrend?: boolean;
  /** KPI card specific: comparison period */
  comparisonPeriod?: "previous" | "year_ago";
}

// ===========================================
// CCO (Chief Compliance Officer) Dashboard
// ===========================================

/**
 * Pre-built widgets for the CCO dashboard.
 * Provides high-level compliance oversight with health metrics,
 * trends, pipeline status, and risk indicators.
 */
export const CCO_WIDGETS: PrebuiltWidget[] = [
  {
    id: "cco-compliance-health",
    widgetType: WidgetType.KPI_CARD,
    title: "Compliance Health Score",
    description:
      "Overall compliance health score (0-100) based on open cases, SLA compliance, and campaign completion",
    dataSource: "compliance_health",
    queryConfig: {
      entity: "computed",
      aggregation: "avg",
    },
    layoutItem: { x: 0, y: 0, w: 2, h: 2, minW: 1, minH: 1 },
    displayConfig: {
      format: { type: "number", precision: 0 },
      showTrend: true,
      comparisonPeriod: "previous",
    },
  },
  {
    id: "cco-open-cases",
    widgetType: WidgetType.KPI_CARD,
    title: "Open Cases",
    description: "Total number of open cases across all categories",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      filters: { status: { not: "CLOSED" } },
    },
    layoutItem: { x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      showTrend: true,
      comparisonPeriod: "previous",
    },
  },
  {
    id: "cco-sla-compliance",
    widgetType: WidgetType.GAUGE,
    title: "SLA Compliance",
    description: "Percentage of cases within SLA targets",
    dataSource: "sla_metrics",
    queryConfig: {
      entity: "case",
      aggregation: "avg",
      aggregateField: "sla_compliance_rate",
    },
    layoutItem: { x: 3, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    chartType: ChartType.GAUGE,
    displayConfig: {
      format: { type: "percentage", precision: 1 },
    },
  },
  {
    id: "cco-riu-trends",
    widgetType: WidgetType.LINE_CHART,
    title: "RIU Intake Trends",
    description: "Risk Intelligence Unit intake volume over time",
    dataSource: "rius",
    queryConfig: {
      entity: "riu",
      aggregation: "count",
      groupBy: ["createdAt"],
      timeGrouping: "week",
    },
    layoutItem: { x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.LINE,
    displayConfig: {
      showGrid: true,
      animate: true,
    },
  },
  {
    id: "cco-case-pipeline",
    widgetType: WidgetType.FUNNEL,
    title: "Case Pipeline",
    description: "Case distribution by status showing workflow progression",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      groupBy: ["status"],
    },
    layoutItem: { x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.FUNNEL,
    displayConfig: {
      showLegend: true,
    },
  },
  {
    id: "cco-campaign-completion",
    widgetType: WidgetType.DONUT_CHART,
    title: "Campaign Completion",
    description: "Active campaign assignment completion status",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaignAssignment",
      aggregation: "count",
      groupBy: ["status"],
      filters: { campaign: { status: "ACTIVE" } },
    },
    layoutItem: { x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.DONUT,
    displayConfig: {
      showLegend: true,
      colors: ["#22c55e", "#f59e0b", "#ef4444"],
      labels: {
        COMPLETED: "Completed",
        PENDING: "Pending",
        OVERDUE: "Overdue",
      },
    },
  },
  {
    id: "cco-top-risk-categories",
    widgetType: WidgetType.PIE_CHART,
    title: "Top Risk Categories",
    description: "Distribution of cases by risk category",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      groupBy: ["categoryId"],
      orderBy: { field: "count", direction: "desc" },
      limit: 6,
    },
    layoutItem: { x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.PIE,
    displayConfig: {
      showLegend: true,
    },
  },
  {
    id: "cco-high-severity",
    widgetType: WidgetType.LIST,
    title: "Recent High-Severity Cases",
    description: "Latest high and critical severity cases requiring attention",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      filters: { severity: { in: ["HIGH", "CRITICAL"] } },
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 5,
    },
    layoutItem: { x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "cco-cases-by-severity",
    widgetType: WidgetType.BAR_CHART,
    title: "Cases by Severity",
    description: "Case count breakdown by severity level",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      groupBy: ["severity"],
    },
    layoutItem: { x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.BAR,
    displayConfig: {
      colors: ["#22c55e", "#f59e0b", "#f97316", "#ef4444"],
      labels: {
        LOW: "Low",
        MEDIUM: "Medium",
        HIGH: "High",
        CRITICAL: "Critical",
      },
    },
  },
  {
    id: "cco-quick-actions",
    widgetType: WidgetType.QUICK_ACTIONS,
    title: "Quick Actions",
    description: "Shortcuts to common CCO actions",
    dataSource: "actions",
    queryConfig: { entity: "actions" },
    layoutItem: { x: 0, y: 4, w: 2, h: 1, minW: 1, minH: 1 },
  },
];

// ===========================================
// Investigator Dashboard
// ===========================================

/**
 * Pre-built widgets for the Investigator dashboard.
 * Focuses on personal workload, assigned cases, SLA tracking,
 * and investigation progress.
 */
export const INVESTIGATOR_WIDGETS: PrebuiltWidget[] = [
  {
    id: "inv-my-case-count",
    widgetType: WidgetType.KPI_CARD,
    title: "My Open Cases",
    description: "Number of cases assigned to you",
    dataSource: "my_cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      filters: { assignedToMe: true, status: { not: "CLOSED" } },
    },
    layoutItem: { x: 0, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      showTrend: true,
    },
  },
  {
    id: "inv-sla-alerts",
    widgetType: WidgetType.KPI_CARD,
    title: "SLA Alerts",
    description: "Cases approaching or past SLA deadline",
    dataSource: "sla_metrics",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      filters: {
        assignedToMe: true,
        slaStatus: { in: ["AT_RISK", "BREACHED"] },
      },
    },
    layoutItem: { x: 1, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      colors: ["#ef4444"],
    },
  },
  {
    id: "inv-investigation-progress",
    widgetType: WidgetType.GAUGE,
    title: "Investigation Progress",
    description: "Average completion percentage of your investigations",
    dataSource: "investigations",
    queryConfig: {
      entity: "investigation",
      aggregation: "avg",
      aggregateField: "progress",
      filters: { assignedToMe: true },
    },
    layoutItem: { x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    chartType: ChartType.GAUGE,
    displayConfig: {
      format: { type: "percentage", precision: 0 },
    },
  },
  {
    id: "inv-my-assignments",
    widgetType: WidgetType.TABLE,
    title: "My Assignments",
    description: "Your currently assigned cases with status and SLA info",
    dataSource: "my_cases",
    queryConfig: {
      entity: "case",
      filters: { assignedToMe: true, status: { not: "CLOSED" } },
      orderBy: { field: "slaDueAt", direction: "asc" },
      limit: 10,
    },
    layoutItem: { x: 3, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
  },
  {
    id: "inv-case-pipeline",
    widgetType: WidgetType.BAR_CHART,
    title: "My Case Pipeline",
    description: "Your cases by status",
    dataSource: "my_cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      groupBy: ["status"],
      filters: { assignedToMe: true },
    },
    layoutItem: { x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.BAR,
    displayConfig: {
      showLegend: false,
    },
  },
  {
    id: "inv-recent-activity",
    widgetType: WidgetType.LIST,
    title: "Recent Activity",
    description: "Latest activity on your assigned cases",
    dataSource: "activity",
    queryConfig: {
      entity: "activity",
      filters: { relatedToMyCases: true },
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 8,
    },
    layoutItem: { x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "inv-unassigned-queue",
    widgetType: WidgetType.TABLE,
    title: "Unassigned Queue",
    description: "Cases awaiting assignment in your categories",
    dataSource: "cases",
    queryConfig: {
      entity: "case",
      filters: { assignedToId: null, status: "NEW" },
      orderBy: { field: "createdAt", direction: "asc" },
      limit: 5,
    },
    layoutItem: { x: 0, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "inv-case-age",
    widgetType: WidgetType.BAR_CHART,
    title: "Case Age Distribution",
    description: "Age distribution of your open cases",
    dataSource: "my_cases",
    queryConfig: {
      entity: "case",
      aggregation: "count",
      groupBy: ["ageGroup"],
      filters: { assignedToMe: true, status: { not: "CLOSED" } },
    },
    layoutItem: { x: 0, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.BAR,
    displayConfig: {
      labels: {
        "0-7": "< 1 week",
        "8-14": "1-2 weeks",
        "15-30": "2-4 weeks",
        "31+": "1+ month",
      },
    },
  },
  {
    id: "inv-quick-actions",
    widgetType: WidgetType.QUICK_ACTIONS,
    title: "Quick Actions",
    description: "Shortcuts to common investigator actions",
    dataSource: "actions",
    queryConfig: { entity: "actions" },
    layoutItem: { x: 4, y: 3, w: 4, h: 1, minW: 2, minH: 1 },
  },
];

// ===========================================
// Campaign Manager Dashboard
// ===========================================

/**
 * Pre-built widgets for the Campaign Manager dashboard.
 * Focuses on disclosure campaigns, attestation tracking,
 * response rates, and conflict alerts.
 */
export const CAMPAIGN_MANAGER_WIDGETS: PrebuiltWidget[] = [
  {
    id: "camp-active-count",
    widgetType: WidgetType.KPI_CARD,
    title: "Active Campaigns",
    description: "Number of currently active campaigns",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaign",
      aggregation: "count",
      filters: { status: "ACTIVE" },
    },
    layoutItem: { x: 0, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
  },
  {
    id: "camp-response-rate",
    widgetType: WidgetType.KPI_CARD,
    title: "Response Rate",
    description: "Overall response rate across active campaigns",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaignAssignment",
      aggregation: "avg",
      aggregateField: "completion_rate",
      filters: { campaign: { status: "ACTIVE" } },
    },
    layoutItem: { x: 1, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      format: { type: "percentage", precision: 1 },
      showTrend: true,
    },
  },
  {
    id: "camp-non-responders",
    widgetType: WidgetType.KPI_CARD,
    title: "Non-Responders",
    description: "Total employees who have not responded to active campaigns",
    dataSource: "campaign_assignments",
    queryConfig: {
      entity: "campaignAssignment",
      aggregation: "count",
      filters: { status: "PENDING", campaign: { status: "ACTIVE" } },
    },
    layoutItem: { x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      colors: ["#f59e0b"],
    },
  },
  {
    id: "camp-conflicts-flagged",
    widgetType: WidgetType.KPI_CARD,
    title: "Conflicts Flagged",
    description: "Number of disclosures flagged as potential conflicts",
    dataSource: "disclosures",
    queryConfig: {
      entity: "disclosure",
      aggregation: "count",
      filters: { conflictDetected: true, reviewStatus: "PENDING_REVIEW" },
    },
    layoutItem: { x: 3, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
    displayConfig: {
      colors: ["#ef4444"],
    },
  },
  {
    id: "camp-active-campaigns-table",
    widgetType: WidgetType.TABLE,
    title: "Active Campaigns",
    description: "List of currently active campaigns with completion metrics",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaign",
      filters: { status: "ACTIVE" },
      orderBy: { field: "dueDate", direction: "asc" },
      limit: 10,
    },
    layoutItem: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
  },
  {
    id: "camp-disclosure-trends",
    widgetType: WidgetType.LINE_CHART,
    title: "Disclosure Trends",
    description: "Disclosure submission volume over time",
    dataSource: "disclosures",
    queryConfig: {
      entity: "disclosure",
      aggregation: "count",
      groupBy: ["createdAt", "type"],
      timeGrouping: "week",
    },
    layoutItem: { x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.LINE,
    displayConfig: {
      showLegend: true,
      showGrid: true,
    },
  },
  {
    id: "camp-attestation-completion",
    widgetType: WidgetType.GAUGE,
    title: "Attestation Completion",
    description: "Completion rate for attestation campaigns",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaignAssignment",
      aggregation: "avg",
      aggregateField: "completion_rate",
      filters: { campaign: { type: "ATTESTATION", status: "ACTIVE" } },
    },
    layoutItem: { x: 0, y: 1, w: 2, h: 2, minW: 1, minH: 1 },
    chartType: ChartType.GAUGE,
    displayConfig: {
      format: { type: "percentage", precision: 0 },
    },
  },
  {
    id: "camp-by-type",
    widgetType: WidgetType.DONUT_CHART,
    title: "Campaigns by Type",
    description: "Distribution of active campaigns by type",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaign",
      aggregation: "count",
      groupBy: ["type"],
      filters: { status: "ACTIVE" },
    },
    layoutItem: { x: 2, y: 1, w: 2, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.DONUT,
    displayConfig: {
      showLegend: true,
      labels: {
        DISCLOSURE: "Disclosure",
        ATTESTATION: "Attestation",
        SURVEY: "Survey",
        ACKNOWLEDGMENT: "Acknowledgment",
      },
    },
  },
  {
    id: "camp-conflict-alerts",
    widgetType: WidgetType.LIST,
    title: "Conflict Alerts",
    description: "Recent disclosures with detected conflicts requiring review",
    dataSource: "disclosures",
    queryConfig: {
      entity: "disclosure",
      filters: { conflictDetected: true },
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 5,
    },
    layoutItem: { x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "camp-upcoming-due",
    widgetType: WidgetType.TABLE,
    title: "Upcoming Deadlines",
    description: "Campaigns with upcoming due dates",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaign",
      filters: { status: "ACTIVE" },
      orderBy: { field: "dueDate", direction: "asc" },
      limit: 5,
    },
    layoutItem: { x: 0, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
  },
  {
    id: "camp-response-by-dept",
    widgetType: WidgetType.BAR_CHART,
    title: "Response Rate by Department",
    description: "Campaign response rates broken down by department",
    dataSource: "campaigns",
    queryConfig: {
      entity: "campaignAssignment",
      aggregation: "avg",
      aggregateField: "completion_rate",
      groupBy: ["employee.businessUnitId"],
      filters: { campaign: { status: "ACTIVE" } },
      limit: 10,
    },
    layoutItem: { x: 4, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
    chartType: ChartType.BAR,
    displayConfig: {
      format: { type: "percentage", precision: 0 },
    },
  },
  {
    id: "camp-quick-actions",
    widgetType: WidgetType.QUICK_ACTIONS,
    title: "Quick Launch",
    description: "Shortcuts to campaign management actions",
    dataSource: "actions",
    queryConfig: { entity: "actions" },
    layoutItem: { x: 8, y: 4, w: 4, h: 1, minW: 2, minH: 1 },
  },
];

// ===========================================
// Dashboard Defaults Export
// ===========================================

/**
 * Dashboard defaults configuration mapping dashboard types to their
 * default widgets and applicable roles.
 */
export const DASHBOARD_DEFAULTS: Record<
  Exclude<DashboardType, "CUSTOM">,
  {
    widgets: PrebuiltWidget[];
    roles: string[];
    description: string;
  }
> = {
  [DashboardType.CCO]: {
    widgets: CCO_WIDGETS,
    roles: ["COMPLIANCE_OFFICER", "CCO", "SYSTEM_ADMIN"],
    description:
      "High-level compliance oversight with health metrics, trends, and risk indicators",
  },
  [DashboardType.INVESTIGATOR]: {
    widgets: INVESTIGATOR_WIDGETS,
    roles: ["INVESTIGATOR", "TRIAGE_LEAD", "CASE_MANAGER"],
    description:
      "Personal workload management with case assignments, SLA tracking, and investigation progress",
  },
  [DashboardType.CAMPAIGN_MANAGER]: {
    widgets: CAMPAIGN_MANAGER_WIDGETS,
    roles: [
      "DEPARTMENT_ADMIN",
      "MANAGER",
      "COMPLIANCE_OFFICER",
      "CAMPAIGN_MANAGER",
    ],
    description:
      "Campaign management with disclosure tracking, response rates, and conflict alerts",
  },
};

/**
 * Cache TTL configuration in seconds by widget type.
 * More volatile data (KPI cards) refresh more frequently.
 */
export const WIDGET_CACHE_TTL: Record<WidgetType, number> = {
  [WidgetType.KPI_CARD]: 60, // 1 minute
  [WidgetType.LINE_CHART]: 300, // 5 minutes
  [WidgetType.BAR_CHART]: 300, // 5 minutes
  [WidgetType.PIE_CHART]: 300, // 5 minutes
  [WidgetType.DONUT_CHART]: 300, // 5 minutes
  [WidgetType.STACKED_BAR]: 300, // 5 minutes
  [WidgetType.AREA_CHART]: 300, // 5 minutes
  [WidgetType.FUNNEL]: 300, // 5 minutes
  [WidgetType.GAUGE]: 120, // 2 minutes
  [WidgetType.HEATMAP]: 600, // 10 minutes
  [WidgetType.TABLE]: 120, // 2 minutes
  [WidgetType.LIST]: 120, // 2 minutes
  [WidgetType.SPARKLINE]: 60, // 1 minute (mini KPI chart)
  [WidgetType.QUICK_ACTIONS]: 3600, // 1 hour (static)
};

/**
 * Helper function to get all pre-built widgets as a flat array.
 */
export function getAllPrebuiltWidgets(): PrebuiltWidget[] {
  return [...CCO_WIDGETS, ...INVESTIGATOR_WIDGETS, ...CAMPAIGN_MANAGER_WIDGETS];
}

/**
 * Helper function to get a pre-built widget by its ID.
 */
export function getPrebuiltWidgetById(id: string): PrebuiltWidget | undefined {
  return getAllPrebuiltWidgets().find((w) => w.id === id);
}

/**
 * Helper function to get the default dashboard type for a role.
 */
export function getDefaultDashboardTypeForRole(
  role: string,
): DashboardType | undefined {
  for (const [type, config] of Object.entries(DASHBOARD_DEFAULTS)) {
    if (config.roles.includes(role)) {
      return type as DashboardType;
    }
  }
  return undefined;
}
