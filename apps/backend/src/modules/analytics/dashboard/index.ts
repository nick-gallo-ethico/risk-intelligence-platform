export * from "./dashboard.module";
export * from "./dashboard-config.service";
export * from "./widget-data.service";
export * from "./scheduled-refresh.service";
export * from "./dashboard.controller";
// Export entities first (canonical source of interfaces)
export * from "./entities";
// Export pre-built widget configurations
export * from "./prebuilt/prebuilt-widgets";
// Export DTOs (class-validator decorated classes)
export {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UserDashboardConfigDto,
  DashboardQueryDto,
  DateRangeDto,
  DashboardLayoutDto,
  DashboardResponseDto,
  WidgetResponseDto,
  UserDashboardConfigResponseDto,
} from "./dto";
// Export widget data types
export type {
  WidgetDataResponse,
  WidgetData,
  KpiData,
  ChartData,
  TableData,
  ListData,
  QuickActionsData,
  BatchWidgetDataResponse,
} from "./dto/widget-data.dto";
