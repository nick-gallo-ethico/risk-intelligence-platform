import {
  Dashboard as PrismaDashboard,
  DashboardWidget as PrismaDashboardWidget,
  UserDashboardConfig as PrismaUserDashboardConfig,
  DashboardType,
  WidgetType,
  ChartType,
  DateRangePreset,
} from "@prisma/client";

/**
 * Layout item interface matching react-grid-layout format.
 */
export interface LayoutItem {
  i: string; // Widget ID
  x: number; // X position in grid units
  y: number; // Y position in grid units
  w: number; // Width in grid units
  h: number; // Height in grid units
  minW?: number; // Minimum width
  minH?: number; // Minimum height
  maxW?: number; // Maximum width
  maxH?: number; // Maximum height
  static?: boolean; // If true, widget cannot be moved
}

/**
 * Responsive layouts for different screen sizes.
 */
export interface ResponsiveLayouts {
  lg?: LayoutItem[]; // Large screens (>= 1200px)
  md?: LayoutItem[]; // Medium screens (>= 996px)
  sm?: LayoutItem[]; // Small screens (>= 768px)
  xs?: LayoutItem[]; // Extra small screens (< 768px)
}

/**
 * Widget query configuration.
 */
export interface WidgetQueryConfig {
  filters?: Record<string, unknown>;
  aggregation?: {
    field: string;
    function: "count" | "sum" | "avg" | "min" | "max";
    groupBy?: string[];
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

/**
 * Widget display configuration.
 */
export interface WidgetDisplayConfig {
  colors?: string[];
  labels?: Record<string, string>;
  format?: {
    type?: "number" | "currency" | "percentage" | "date";
    precision?: number;
    locale?: string;
  };
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
}

/**
 * Date range override configuration.
 */
export interface DateRangeOverride {
  preset?: DateRangePreset;
  start?: string;
  end?: string;
}

/**
 * Dashboard entity with typed JSON fields.
 */
export interface Dashboard extends Omit<PrismaDashboard, "layouts"> {
  layouts: ResponsiveLayouts;
}

/**
 * Dashboard widget entity with typed JSON fields.
 */
export interface DashboardWidget extends Omit<
  PrismaDashboardWidget,
  "queryConfig" | "layoutItem" | "displayConfig" | "dateRangeOverride"
> {
  queryConfig: WidgetQueryConfig | null;
  layoutItem: LayoutItem;
  displayConfig: WidgetDisplayConfig | null;
  dateRangeOverride: DateRangeOverride | null;
}

/**
 * User dashboard config entity with typed JSON fields.
 */
export interface UserDashboardConfig extends Omit<
  PrismaUserDashboardConfig,
  "layoutOverrides" | "widgetOverrides"
> {
  layoutOverrides: ResponsiveLayouts | null;
  widgetOverrides: Record<string, Partial<WidgetDisplayConfig>> | null;
}

/**
 * Dashboard with widgets included.
 */
export interface DashboardWithWidgets extends Dashboard {
  widgets: DashboardWidget[];
}

/**
 * Dashboard with user configuration.
 */
export interface DashboardWithUserConfig extends DashboardWithWidgets {
  userConfig?: UserDashboardConfig;
}

/**
 * Default widget configurations for role-based dashboards.
 */
export const DEFAULT_WIDGET_CONFIGS: Record<
  DashboardType,
  Array<{
    widgetType: WidgetType;
    title: string;
    dataSource: string;
    layoutItem: LayoutItem;
    chartType?: ChartType;
  }>
> = {
  [DashboardType.CCO]: [
    {
      widgetType: WidgetType.KPI_CARD,
      title: "Compliance Health Score",
      dataSource: "compliance-metrics",
      layoutItem: { i: "health-score", x: 0, y: 0, w: 1, h: 1 },
    },
    {
      widgetType: WidgetType.LINE_CHART,
      title: "RIU Intake Trends",
      dataSource: "rius",
      layoutItem: { i: "riu-trends", x: 1, y: 0, w: 2, h: 1 },
      chartType: ChartType.LINE,
    },
    {
      widgetType: WidgetType.FUNNEL,
      title: "Case Pipeline",
      dataSource: "cases",
      layoutItem: { i: "case-pipeline", x: 3, y: 0, w: 2, h: 1 },
      chartType: ChartType.FUNNEL,
    },
    {
      widgetType: WidgetType.BAR_CHART,
      title: "Campaign Completion",
      dataSource: "campaigns",
      layoutItem: { i: "campaign-completion", x: 0, y: 1, w: 2, h: 1 },
      chartType: ChartType.BAR,
    },
    {
      widgetType: WidgetType.GAUGE,
      title: "SLA Performance",
      dataSource: "sla-metrics",
      layoutItem: { i: "sla-performance", x: 2, y: 1, w: 1, h: 1 },
      chartType: ChartType.GAUGE,
    },
    {
      widgetType: WidgetType.PIE_CHART,
      title: "Top Risk Categories",
      dataSource: "cases",
      layoutItem: { i: "risk-categories", x: 3, y: 1, w: 1, h: 1 },
      chartType: ChartType.PIE,
    },
    {
      widgetType: WidgetType.LIST,
      title: "Recent High-Severity",
      dataSource: "cases",
      layoutItem: { i: "high-severity", x: 0, y: 2, w: 1, h: 2 },
    },
    {
      widgetType: WidgetType.QUICK_ACTIONS,
      title: "Board Report Quick Gen",
      dataSource: "reports",
      layoutItem: { i: "board-report", x: 1, y: 2, w: 1, h: 1 },
    },
  ],
  [DashboardType.INVESTIGATOR]: [
    {
      widgetType: WidgetType.TABLE,
      title: "My Assignments",
      dataSource: "cases",
      layoutItem: { i: "my-assignments", x: 0, y: 0, w: 2, h: 2 },
    },
    {
      widgetType: WidgetType.FUNNEL,
      title: "Case Pipeline",
      dataSource: "cases",
      layoutItem: { i: "case-pipeline", x: 2, y: 0, w: 2, h: 1 },
      chartType: ChartType.FUNNEL,
    },
    {
      widgetType: WidgetType.KPI_CARD,
      title: "SLA Alerts",
      dataSource: "sla-metrics",
      layoutItem: { i: "sla-alerts", x: 4, y: 0, w: 1, h: 1 },
    },
    {
      widgetType: WidgetType.LIST,
      title: "Recent Activity",
      dataSource: "activity",
      layoutItem: { i: "recent-activity", x: 4, y: 1, w: 1, h: 2 },
    },
    {
      widgetType: WidgetType.TABLE,
      title: "Unassigned Queue",
      dataSource: "cases",
      layoutItem: { i: "unassigned", x: 0, y: 2, w: 2, h: 1 },
    },
    {
      widgetType: WidgetType.GAUGE,
      title: "Investigation Progress",
      dataSource: "investigations",
      layoutItem: { i: "inv-progress", x: 2, y: 1, w: 1, h: 1 },
      chartType: ChartType.GAUGE,
    },
    {
      widgetType: WidgetType.QUICK_ACTIONS,
      title: "Quick Actions",
      dataSource: "actions",
      layoutItem: { i: "quick-actions", x: 3, y: 1, w: 1, h: 1 },
    },
  ],
  [DashboardType.CAMPAIGN_MANAGER]: [
    {
      widgetType: WidgetType.TABLE,
      title: "Active Campaigns",
      dataSource: "campaigns",
      layoutItem: { i: "active-campaigns", x: 0, y: 0, w: 2, h: 2 },
    },
    {
      widgetType: WidgetType.LINE_CHART,
      title: "Disclosure Trends",
      dataSource: "disclosures",
      layoutItem: { i: "disclosure-trends", x: 2, y: 0, w: 2, h: 1 },
      chartType: ChartType.LINE,
    },
    {
      widgetType: WidgetType.KPI_CARD,
      title: "Non-Responders",
      dataSource: "campaign-assignments",
      layoutItem: { i: "non-responders", x: 4, y: 0, w: 1, h: 1 },
    },
    {
      widgetType: WidgetType.LIST,
      title: "Conflict Alerts",
      dataSource: "conflict-alerts",
      layoutItem: { i: "conflict-alerts", x: 4, y: 1, w: 1, h: 2 },
    },
    {
      widgetType: WidgetType.TABLE,
      title: "Campaign Calendar",
      dataSource: "campaigns",
      layoutItem: { i: "campaign-calendar", x: 0, y: 2, w: 2, h: 1 },
    },
    {
      widgetType: WidgetType.GAUGE,
      title: "Attestation Completion",
      dataSource: "campaign-assignments",
      layoutItem: { i: "attestation-completion", x: 2, y: 1, w: 1, h: 1 },
      chartType: ChartType.GAUGE,
    },
    {
      widgetType: WidgetType.QUICK_ACTIONS,
      title: "Quick Launch",
      dataSource: "actions",
      layoutItem: { i: "quick-launch", x: 3, y: 1, w: 1, h: 1 },
    },
  ],
  [DashboardType.CUSTOM]: [],
};

/**
 * Grid configuration constants.
 */
export const GRID_CONFIG = {
  cols: { lg: 12, md: 10, sm: 6, xs: 4 },
  rowHeight: 100,
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
  containerPadding: [16, 16] as [number, number],
  margin: [16, 16] as [number, number],
};

// Re-export Prisma enums for convenience
export { DashboardType, WidgetType, ChartType, DateRangePreset };
